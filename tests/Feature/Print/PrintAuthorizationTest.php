<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\Asset;
use App\Models\Edition;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;
use App\Print\PrintChannel;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * Proof that an id or a token in the URL never opens somebody else's data
 * (B69): one test per route, for another user, for a guest and for a wrong token.
 */
final class PrintAuthorizationTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    private User $owner;

    private User $intruder;

    private Edition $edition;

    private PrintJob $userJob;

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = $this->createUser('owner@example.test');
        $this->intruder = $this->createUser('intruder@example.test');
        $this->edition = $this->createEditionFor($this->owner);

        $this->userJob = $this->printJobFor($this->owner, $this->edition);

        $this->generate($this->userJob, 'printer', ['cards'])->assertOk();
        app('auth')->forgetGuards();
    }

    #[Test]
    public function another_user_cannot_use_a_job_of_somebody_else(): void
    {
        $token = $this->userJob->token;

        $this->actingAs($this->intruder);

        $this->get('/nl/print/' . $token)->assertForbidden();
        $this->getJson('/api/print/' . $token . '/status')->assertForbidden();
        $this->postJson('/api/print/' . $token . '/generate', ['set' => 'printer', 'parts' => ['board']])->assertForbidden();
        $this->get('/api/print/' . $token . '/files/printer/cards')->assertForbidden();
        $this->get('/api/print/' . $token . '/instructions/cards')->assertForbidden();
        $this->get('/api/print/' . $token . '/zip/printer')->assertForbidden();
    }

    #[Test]
    public function a_guest_cannot_use_the_token_of_a_job_with_an_account(): void
    {
        $token = $this->userJob->token;
        $this->flushSession();
        app('auth')->forgetGuards();

        $this->getJson('/api/print/' . $token . '/status')->assertForbidden();
        $this->get('/api/print/' . $token . '/files/printer/cards')->assertForbidden();
        $this->get('/nl/print/' . $token)->assertForbidden();
    }

    #[Test]
    public function the_owner_does_reach_their_job(): void
    {
        $token = $this->userJob->token;

        $this->actingAs($this->owner);

        $this->getJson('/api/print/' . $token . '/status')->assertOk();
        $this->get('/api/print/' . $token . '/files/printer/cards')->assertOk();
        $this->get('/nl/print/' . $token)->assertOk();
    }

    #[Test]
    public function a_wrong_token_finds_nothing(): void
    {
        $this->getJson('/api/print/not-a-real-token/status')->assertNotFound();
        $this->postJson('/api/print/not-a-real-token/generate', ['set' => 'printer', 'parts' => ['board']])->assertNotFound();
        $this->get('/api/print/not-a-real-token/files/printer/cards')->assertNotFound();
        $this->get('/api/print/not-a-real-token/zip/printer')->assertNotFound();
        $this->get('/nl/print/not-a-real-token')->assertNotFound();
        // The document id is not a token.
        $this->getJson('/api/print/' . $this->userJob->publicId() . '/status')->assertNotFound();
    }

    #[Test]
    public function an_anonymous_job_is_reached_by_its_token_alone_and_by_nobody_without_it(): void
    {
        $this->flushSession();
        $job = $this->createAnonymousJob();
        $other = $this->createAnonymousJob();

        $this->getJson('/api/print/' . $job->token . '/status')->assertOk();
        $this->actingAs($this->intruder)->getJson('/api/print/' . $job->token . '/status')->assertOk();

        // The token of one job opens none of the files of another.
        $this->generate($job, 'printer', ['cards'])->assertOk();
        $this->get('/api/print/' . $other->token . '/files/printer/cards')->assertNotFound();
        $this->getJson('/api/print/' . $job->publicId() . '/status')->assertNotFound();
    }

    #[Test]
    public function another_user_cannot_read_change_or_print_somebody_elses_edition(): void
    {
        $id = $this->edition->edition_id;
        $this->actingAs($this->intruder);

        // Someone else's edition answers 404, the same as an id that does not exist.
        $this->getJson('/api/editions/' . $id)->assertNotFound();
        $this->putJson('/api/editions/' . $id, [...$this->editionArray('Gekaapt'), 'revision' => 1])->assertNotFound();
        $this->postJson('/api/editions/' . $id . '/print-job')->assertNotFound();
        $this->post('/api/editions/' . $id . '/assets', ['ref' => 'photo-ref-0002', 'photo' => $this->photoUpload()], ['Accept' => 'application/json'])->assertNotFound();

        self::assertSame('Zaterdagclub', Edition::query()->where('edition_id', $id)->firstOrFail()->name);
        self::assertSame(1, Asset::query()->count(), 'the intruder uploaded nothing');
    }

    #[Test]
    public function a_guest_cannot_use_the_edition_routes(): void
    {
        $id = $this->edition->edition_id;
        app('auth')->forgetGuards();
        $this->flushSession();

        $this->getJson('/api/editions/' . $id)->assertUnauthorized();
        $this->putJson('/api/editions/' . $id, $this->editionArray())->assertUnauthorized();
        $this->postJson('/api/editions', $this->editionArray())->assertUnauthorized();
        $this->postJson('/api/editions/' . $id . '/print-job')->assertUnauthorized();
        $this->getJson('/api/assets/' . Asset::query()->firstOrFail()->publicId() . '/preview')->assertUnauthorized();
    }

    #[Test]
    public function a_photo_preview_is_only_for_its_owner_and_through_a_temporary_link(): void
    {
        $asset = Asset::query()->where('user_id', $this->owner->publicId())->firstOrFail();

        $this->actingAs($this->intruder)->get('/api/assets/' . $asset->publicId() . '/preview')->assertForbidden();

        $response = $this->actingAs($this->owner)->get('/api/assets/' . $asset->publicId() . '/preview');
        $response->assertRedirect();
        self::assertStringContainsString('expiration=', (string) $response->headers->get('Location'));
    }

    #[Test]
    public function the_photos_of_an_anonymous_job_are_never_served_by_id(): void
    {
        $job = $this->createAnonymousJob();
        $asset = Asset::query()->where('print_job_id', $job->publicId())->firstOrFail();

        $this->actingAs($this->owner)->get('/api/assets/' . $asset->publicId() . '/preview')->assertForbidden();
    }

    #[Test]
    public function a_placement_cannot_pull_in_a_photo_of_somebody_else(): void
    {
        // The intruder's edition points at the owner's photo ref: it is not found in the intruder's own photos.
        $intruderEdition = $this->createEditionWithId($this->intruder, 'e-intruder', withPhoto: false);

        $job = $this->printJobFor($this->intruder, $intruderEdition);

        $this->generate($job, 'printer', ['board'])->assertOk();

        self::assertSame('failed', $this->partStatus($job, PrintSet::Printer, PrintPart::Board));
        self::assertNull(PrintFile::query()->where('print_job_id', $job->publicId())->first());
    }

    #[Test]
    public function the_render_crop_route_needs_a_valid_signature(): void
    {
        $job = $this->createAnonymousJob();
        $name = sha1('x') . '.jpg';
        Storage::disk('local')->put('print-work/' . $job->publicId() . '/printer-board/' . $name, 'jpegbytes');

        $this->get('/print-render/' . $job->token . '/printer-board/' . $name)->assertForbidden();

        $signed = URL::temporarySignedRoute('print.render.crop', CarbonImmutable::now()->addMinutes(5), ['printJob' => $job->token, 'folder' => 'printer-board', 'name' => $name]);
        $this->get($signed)->assertOk();

        $expired = URL::temporarySignedRoute('print.render.crop', CarbonImmutable::now()->subMinute(), ['printJob' => $job->token, 'folder' => 'printer-board', 'name' => $name]);
        $this->get($expired)->assertForbidden();

        // Another job's token with this signature does not work.
        $tampered = str_replace($job->token, $this->userJob->token, $signed);
        $this->get($tampered)->assertForbidden();
    }

    #[Test]
    public function the_reverb_channel_of_a_job_with_an_account_is_authorised_by_policy(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);
        // The channel callbacks live on the broadcaster; register them on the new one.
        Broadcast::purge();
        require base_path('routes/channels.php');

        $payload = ['channel_name' => 'private-print-job.' . $this->userJob->token, 'socket_id' => '1234.5678'];

        $this->actingAs($this->intruder)->post('/broadcasting/auth', $payload)->assertForbidden();
        $this->actingAs($this->owner)->post('/broadcasting/auth', $payload)->assertOk();
    }

    #[Test]
    public function the_channel_names_do_not_leak_the_other_kind_of_job(): void
    {
        $anonymous = $this->createAnonymousJob();

        $status = $this->getJson('/api/print/' . $anonymous->token . '/status')->assertOk();
        self::assertStringNotContainsString('path', (string) json_encode($status->json()), 'a status carries no storage paths');
        self::assertSame('print-anon.' . $anonymous->token, PrintChannel::data($anonymous)->name);
        self::assertSame('print-job.' . $this->userJob->token, PrintChannel::data($this->userJob)->name);
    }
}
