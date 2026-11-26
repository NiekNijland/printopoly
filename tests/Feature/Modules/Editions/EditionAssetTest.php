<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions;

use App\Events\AccountDeleting;
use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Editions\Events\EditionDeletedEvent;
use App\Modules\Editions\Events\EditionDuplicatedEvent;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

/**
 * Photos and print jobs of the editions of an account: upload (B61, B69, B70) and what happens to
 * them when the edition is copied or deleted, or the account goes (B68).
 */
final class EditionAssetTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_it_stores_an_upload_as_a_preview_and_a_print_source_and_never_the_original(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);

        $asset = Asset::query()->where('user_id', $user->publicId())->firstOrFail();

        self::assertSame($edition->edition_id, $asset->edition_id);
        self::assertSame([800, 600], [$asset->width, $asset->height]);
        self::assertNotSame('', $asset->checksum);
        self::assertCount(2, Storage::disk('local')->allFiles('assets'), 'preview and print source only');
        self::assertStringEndsWith('preview.webp', $asset->preview_path);
        self::assertStringEndsWith('print.jpg', $asset->print_path);
    }

    public function test_the_same_ref_uploaded_again_replaces_the_photo(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);

        $this->actingAs($user)
            ->post('/api/editions/' . $edition->edition_id . '/assets', ['ref' => PrintScenario::PHOTO_REF, 'photo' => PrintScenario::photoUpload()], ['Accept' => 'application/json'])
            ->assertCreated();

        self::assertSame(1, Asset::query()->where('user_id', $user->publicId())->count());
        self::assertCount(2, Storage::disk('local')->allFiles('assets'));
    }

    public function test_it_refuses_a_bad_upload_and_a_full_account(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);
        $url = '/api/editions/' . $edition->edition_id . '/assets';

        $this->actingAs($user)
            ->post($url, ['ref' => 'photo-ref-0002', 'photo' => UploadedFile::fake()->createWithContent('x.jpg', 'not an image')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');

        $this->post($url, ['ref' => '../bad', 'photo' => PrintScenario::photoUpload()], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('ref');

        config(['printopoly.limits.account_storage_megabytes' => 0]);
        $this->post($url, ['ref' => 'photo-ref-0003', 'photo' => PrintScenario::photoUpload()], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photo');
    }

    public function test_an_edition_has_one_print_job_that_is_reused(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);

        $first = $this->actingAs($user)->postJson('/api/editions/' . $edition->edition_id . '/print-job')->assertCreated();
        $second = $this->postJson('/api/editions/' . $edition->edition_id . '/print-job')->assertOk();

        self::assertSame($first->json('token'), $second->json('token'));
        self::assertSame(1, PrintJob::query()->where('user_id', $user->publicId())->count());
        self::assertNull(PrintJob::query()->firstOrFail()->expires_at, 'jobs with an account stay');
        self::assertSame('nl', PrintJob::query()->firstOrFail()->locale);
    }

    public function test_a_copy_of_an_edition_gets_its_own_photos_under_the_same_ids(): void
    {
        $user = User::factory()->create();
        $original = PrintScenario::createEditionFor($this, $user, 'e-original');

        $this->actingAs($user)->postJson('/api/editions/' . $original->edition_id . '/duplicate')->assertCreated();

        $copyId = (string) Asset::query()->where('edition_id', '!=', 'e-original')->firstOrFail()->edition_id;
        $assets = Asset::query()->where('user_id', $user->publicId())->orderBy('edition_id')->get();

        self::assertCount(2, $assets);
        self::assertSame([PrintScenario::PHOTO_REF, PrintScenario::PHOTO_REF], $assets->pluck('ref')->all());
        $paths = [];
        foreach ($assets as $asset) {
            $paths[] = $asset->print_path;
        }

        self::assertNotSame($paths[0], $paths[1], 'no shared file');
        Storage::disk('local')->assertExists($paths[1]);
        self::assertNotSame('e-original', $copyId);

        // Deleting the original leaves the copy's photos alone.
        $this->deleteJson('/api/editions/' . $original->edition_id)->assertNoContent();

        self::assertSame(1, Asset::query()->where('user_id', $user->publicId())->count());
        self::assertSame($copyId, Asset::query()->firstOrFail()->edition_id);
        Storage::disk('local')->assertExists(Asset::query()->firstOrFail()->print_path);
        self::assertCount(2, Storage::disk('local')->allFiles('assets'));
    }

    public function test_deleting_an_edition_removes_its_photos_print_job_and_pdfs(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user, 'e-gone');
        $keep = PrintScenario::createEditionFor($this, $user, 'e-kept');
        $job = PrintScenario::printJobFor($this, $user, $edition);
        PrintScenario::printJobFor($this, $user, $keep);
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        self::assertGreaterThan(0, PrintFile::query()->count());

        $this->deleteJson('/api/editions/e-gone')->assertNoContent();

        self::assertSame(0, PrintFile::query()->where('print_job_id', $job->publicId())->count());
        self::assertNull(PrintJob::query()->where('token', $job->token)->first());
        self::assertSame(0, Asset::query()->where('edition_id', 'e-gone')->count());
        self::assertSame(1, Asset::query()->where('edition_id', 'e-kept')->count());
        self::assertCount(2, Storage::disk('local')->allFiles(), 'only the kept edition photos remain');
    }

    public function test_deleting_the_account_removes_every_photo_job_and_pdf_of_the_user_and_nobody_elses(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create(['email' => 'other@example.test']);
        $mine = PrintScenario::createEditionFor($this, $user);
        $theirs = PrintScenario::createEditionFor($this, $other);
        $job = PrintScenario::printJobFor($this, $user, $mine);
        PrintScenario::printJobFor($this, $other, $theirs);
        $this->actingAs($user);
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        event(new AccountDeleting($user->publicId()));

        self::assertSame(0, Asset::query()->where('user_id', $user->publicId())->count());
        self::assertSame(0, PrintJob::query()->where('user_id', $user->publicId())->count());
        self::assertSame(0, PrintFile::query()->where('print_job_id', $job->publicId())->count());
        self::assertSame(1, Asset::query()->where('user_id', $other->publicId())->count());
        self::assertSame(1, PrintJob::query()->where('user_id', $other->publicId())->count());
        self::assertCount(2, Storage::disk('local')->allFiles(), 'only the photos of the other user remain');
    }

    public function test_the_account_delete_request_leaves_no_photo_or_pdf_on_the_disk(): void
    {
        $user = User::factory()->create(['email' => 'gone@example.test']);
        $other = User::factory()->create(['email' => 'stays@example.test']);
        $mine = PrintScenario::createEditionFor($this, $user);
        $theirs = PrintScenario::createEditionFor($this, $other);
        $job = PrintScenario::printJobFor($this, $user, $mine);
        PrintScenario::printJobFor($this, $other, $theirs);
        $this->actingAs($user);
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        $before = Storage::disk('local')->allFiles();
        self::assertGreaterThan(2, count($before), 'photos, a PDF and its instructions are on the disk');

        $this->deleteJson('/api/account', ['confirmation' => 'gone@example.test'])->assertOk();

        self::assertNull(User::query()->where('email', 'gone@example.test')->first());
        self::assertSame(0, Asset::query()->where('user_id', $user->publicId())->count());
        self::assertSame(0, PrintJob::query()->where('user_id', $user->publicId())->count());
        self::assertSame(0, PrintFile::query()->where('print_job_id', $job->publicId())->count());

        $left = Storage::disk('local')->allFiles();
        self::assertCount(2, $left, 'only the photos of the other user remain');
        foreach ($left as $path) {
            self::assertStringNotContainsString($job->publicId(), $path);
        }
    }

    public function test_the_listeners_are_wired_to_the_events(): void
    {
        self::assertTrue(resolve(Dispatcher::class)->hasListeners(EditionDeletedEvent::class));
        self::assertTrue(resolve(Dispatcher::class)->hasListeners(EditionDuplicatedEvent::class));
        self::assertTrue(resolve(Dispatcher::class)->hasListeners(AccountDeleting::class));
    }

    public function test_the_print_button_of_the_editor_leads_to_the_job_of_a_stored_edition_or_to_the_upload_page(): void
    {
        $owner = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $owner, 'e-printme');

        $response = $this->actingAs($owner)->get('/nl/editions/e-printme/print');
        $job = PrintJob::query()->where('user_id', $owner->publicId())->firstOrFail();
        $response->assertRedirect('/nl/print/' . $job->token);

        // Somebody else, or a guest, prints an edition of their own browser: the page uploads it.
        $this->actingAs(User::factory()->create(['email' => 'else@example.test']))
            ->get('/nl/editions/' . $edition->edition_id . '/print')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->component('print/show')->where('job', null)->where('localEditionId', 'e-printme'));
        self::assertSame(1, PrintJob::query()->count(), 'no job was made for the other user');
    }

    public function test_the_row_asked_for_by_niet_in_je_set_survives_the_way_to_the_job(): void
    {
        $owner = User::factory()->create();
        PrintScenario::createEditionFor($this, $owner, 'e-printme');

        $response = $this->actingAs($owner)->get('/nl/editions/e-printme/print?part=tokens');
        $job = PrintJob::query()->where('user_id', $owner->publicId())->firstOrFail();
        $response->assertRedirect('/nl/print/' . $job->token . '?part=tokens');

        // Anything else is dropped, not passed on.
        $this->actingAs($owner)->get('/nl/editions/e-printme/print?part=' . urlencode('<x>'))
            ->assertRedirect('/nl/print/' . $job->token);
    }
}
