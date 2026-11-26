<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Models\Asset;
use App\Models\Edition;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintChannel;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Auth\Factory;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

/**
 * Proof that an id or a token in the URL never opens somebody else's data
 * (B69): one test per route, for another user, for a guest and for a wrong token.
 */
final class PrintAuthorizationTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_another_user_cannot_use_a_job_of_somebody_else(): void
    {
        ['intruder' => $intruder, 'userJob' => $userJob] = $this->scenario();

        $token = $userJob->token;

        $this->actingAs($intruder);

        $this->get('/nl/print/' . $token)->assertForbidden();
        $this->getJson('/api/print/' . $token . '/status')->assertForbidden();
        $this->postJson('/api/print/' . $token . '/generate', ['set' => 'printer', 'parts' => ['board']])->assertForbidden();
        $this->get('/api/print/' . $token . '/files/printer/cards')->assertForbidden();
        $this->get('/api/print/' . $token . '/instructions/cards')->assertForbidden();
        $this->get('/api/print/' . $token . '/zip/printer')->assertForbidden();
    }

    public function test_a_guest_cannot_use_the_token_of_a_job_with_an_account(): void
    {
        ['userJob' => $userJob] = $this->scenario();

        $token = $userJob->token;
        $this->flushSession();
        resolve(Factory::class)->forgetGuards();

        $this->getJson('/api/print/' . $token . '/status')->assertForbidden();
        $this->get('/api/print/' . $token . '/files/printer/cards')->assertForbidden();
        $this->get('/nl/print/' . $token)->assertForbidden();
    }

    public function test_the_owner_does_reach_their_job(): void
    {
        ['owner' => $owner, 'userJob' => $userJob] = $this->scenario();

        $token = $userJob->token;

        $this->actingAs($owner);

        $this->getJson('/api/print/' . $token . '/status')->assertOk();
        $this->get('/api/print/' . $token . '/files/printer/cards')->assertOk();
        $this->get('/nl/print/' . $token)->assertOk();
    }

    public function test_a_wrong_token_finds_nothing(): void
    {
        ['userJob' => $userJob] = $this->scenario();

        $this->getJson('/api/print/not-a-real-token/status')->assertNotFound();
        $this->postJson('/api/print/not-a-real-token/generate', ['set' => 'printer', 'parts' => ['board']])->assertNotFound();
        $this->get('/api/print/not-a-real-token/files/printer/cards')->assertNotFound();
        $this->get('/api/print/not-a-real-token/zip/printer')->assertNotFound();
        $this->get('/nl/print/not-a-real-token')->assertNotFound();
        // The document id is not a token.
        $this->getJson('/api/print/' . $userJob->publicId() . '/status')->assertNotFound();
    }

    public function test_an_anonymous_job_is_reached_by_its_token_alone_and_by_nobody_without_it(): void
    {
        ['intruder' => $intruder] = $this->scenario();

        $this->flushSession();
        $job = PrintScenario::createAnonymousJob($this);
        $other = PrintScenario::createAnonymousJob($this);

        $this->getJson('/api/print/' . $job->token . '/status')->assertOk();
        $this->actingAs($intruder)->getJson('/api/print/' . $job->token . '/status')->assertOk();

        // The token of one job opens none of the files of another.
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        $this->get('/api/print/' . $other->token . '/files/printer/cards')->assertNotFound();
        $this->getJson('/api/print/' . $job->publicId() . '/status')->assertNotFound();
    }

    public function test_another_user_cannot_read_change_or_print_somebody_elses_edition(): void
    {
        ['intruder' => $intruder, 'edition' => $edition] = $this->scenario();

        $id = $edition->edition_id;
        $this->actingAs($intruder);

        // Someone else's edition answers 404, the same as an id that does not exist.
        $this->getJson('/api/editions/' . $id)->assertNotFound();
        $this->putJson('/api/editions/' . $id, [...PrintScenario::editionArray('Gekaapt'), 'revision' => 1])->assertNotFound();
        $this->postJson('/api/editions/' . $id . '/print-job')->assertNotFound();
        $this->post('/api/editions/' . $id . '/assets', ['ref' => 'photo-ref-0002', 'photo' => PrintScenario::photoUpload()], ['Accept' => 'application/json'])->assertNotFound();

        self::assertSame('Zaterdagclub', Edition::query()->where('edition_id', $id)->firstOrFail()->name);
        self::assertSame(1, Asset::query()->count(), 'the intruder uploaded nothing');
    }

    public function test_a_guest_cannot_use_the_edition_routes(): void
    {
        ['edition' => $edition] = $this->scenario();

        $id = $edition->edition_id;
        resolve(Factory::class)->forgetGuards();
        $this->flushSession();

        $this->getJson('/api/editions/' . $id)->assertUnauthorized();
        $this->putJson('/api/editions/' . $id, PrintScenario::editionArray())->assertUnauthorized();
        $this->postJson('/api/editions', PrintScenario::editionArray())->assertUnauthorized();
        $this->postJson('/api/editions/' . $id . '/print-job')->assertUnauthorized();
        $this->getJson('/api/assets/' . Asset::query()->firstOrFail()->publicId() . '/preview')->assertUnauthorized();
    }

    public function test_a_photo_preview_is_only_for_its_owner_and_through_a_temporary_link(): void
    {
        ['owner' => $owner, 'intruder' => $intruder] = $this->scenario();

        $asset = Asset::query()->where('user_id', $owner->publicId())->firstOrFail();

        $this->actingAs($intruder)->get('/api/assets/' . $asset->publicId() . '/preview')->assertForbidden();

        $response = $this->actingAs($owner)->get('/api/assets/' . $asset->publicId() . '/preview');
        $response->assertRedirect();
        self::assertStringContainsString('expiration=', (string) $response->headers->get('Location'));
    }

    public function test_the_photos_of_an_anonymous_job_are_never_served_by_id(): void
    {
        ['owner' => $owner] = $this->scenario();

        $job = PrintScenario::createAnonymousJob($this);
        $asset = Asset::query()->where('print_job_id', $job->publicId())->firstOrFail();

        $this->actingAs($owner)->get('/api/assets/' . $asset->publicId() . '/preview')->assertForbidden();
    }

    public function test_a_placement_cannot_pull_in_a_photo_of_somebody_else(): void
    {
        ['intruder' => $intruder] = $this->scenario();

        // The intruder's edition points at the owner's photo ref: it is not found in the intruder's own photos.
        $intruderEdition = PrintScenario::createEditionWithId($this, $intruder, 'e-intruder', withPhoto: false);

        $job = PrintScenario::printJobFor($this, $intruder, $intruderEdition);

        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();

        self::assertSame('failed', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Board));
        self::assertNull(PrintFile::query()->where('print_job_id', $job->publicId())->first());
    }

    public function test_the_render_crop_route_needs_a_valid_signature(): void
    {
        ['userJob' => $userJob] = $this->scenario();

        $job = PrintScenario::createAnonymousJob($this);
        $name = sha1('x') . '.jpg';
        Storage::disk('local')->put('print-work/' . $job->publicId() . '/printer-board/' . $name, 'jpegbytes');

        $this->get('/print-render/' . $job->token . '/printer-board/' . $name)->assertForbidden();

        $signed = URL::temporarySignedRoute('print.render.crop', CarbonImmutable::now()->addMinutes(5), ['printJob' => $job->token, 'folder' => 'printer-board', 'name' => $name], absolute: false);
        $this->get($signed)->assertOk();
        // The signature holds on any origin, so Chrome can fetch it from the loopback server.
        $this->get('http://printopoly.nl:8080' . $signed)->assertOk();

        $expired = URL::temporarySignedRoute('print.render.crop', CarbonImmutable::now()->subMinute(), ['printJob' => $job->token, 'folder' => 'printer-board', 'name' => $name], absolute: false);
        $this->get($expired)->assertForbidden();

        // Another job's token with this signature does not work.
        $tampered = str_replace($job->token, $userJob->token, $signed);
        $this->get($tampered)->assertForbidden();
    }

    public function test_the_reverb_channel_of_a_job_with_an_account_is_authorised_by_policy(): void
    {
        ['owner' => $owner, 'intruder' => $intruder, 'userJob' => $userJob] = $this->scenario();

        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);
        // The channel callbacks live on the broadcaster; register them on the new one.
        Broadcast::purge();
        require base_path('routes/channels.php');

        $payload = ['channel_name' => 'private-print-job.' . $userJob->token, 'socket_id' => '1234.5678'];

        $this->actingAs($intruder)->post('/broadcasting/auth', $payload)->assertForbidden();
        $this->actingAs($owner)->post('/broadcasting/auth', $payload)->assertOk();
    }

    public function test_the_channel_names_do_not_leak_the_other_kind_of_job(): void
    {
        ['userJob' => $userJob] = $this->scenario();

        $anonymous = PrintScenario::createAnonymousJob($this);

        $status = $this->getJson('/api/print/' . $anonymous->token . '/status')->assertOk();
        self::assertStringNotContainsString('path', (string) json_encode($status->json()), 'a status carries no storage paths');
        self::assertSame('print-anon.' . $anonymous->token, PrintChannel::data($anonymous)->name);
        self::assertSame('print-job.' . $userJob->token, PrintChannel::data($userJob)->name);
    }

    /**
     * @return array{owner: User, intruder: User, edition: Edition, userJob: PrintJob}
     */
    private function scenario(): array
    {
        $owner = User::factory()->create(['email' => 'owner@example.test']);
        $intruder = User::factory()->create(['email' => 'intruder@example.test']);
        $edition = PrintScenario::createEditionFor($this, $owner);
        $userJob = PrintScenario::printJobFor($this, $owner, $edition);
        PrintScenario::generate($this, $userJob, 'printer', ['cards'])->assertOk();
        resolve(Factory::class)->forgetGuards();

        return ['owner' => $owner, 'intruder' => $intruder, 'edition' => $edition, 'userJob' => $userJob];
    }
}
