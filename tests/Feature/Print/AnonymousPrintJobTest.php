<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Events\PrintStatusUpdated;
use App\Models\Asset;
use App\Models\PrintJob;
use App\Modules\Photos\Support\PhotoCropper;
use App\Modules\Photos\ValueObjects\PhotoPlacement;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Imagick;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\Support\TestImages;
use Tests\TestCase;

final class AnonymousPrintJobTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_it_creates_a_job_with_a_secret_token_and_stores_the_photos_for_that_job_only(): void
    {
        $response = PrintScenario::postAnonymousJob($this)->assertCreated();

        $token = PrintScenario::jsonString($response, 'token');
        self::assertSame(40, strlen($token));
        $response->assertJsonPath('url', url('/nl/print/' . $token));

        $job = PrintJob::query()->where('token', $token)->firstOrFail();
        self::assertTrue($job->isAnonymous());
        self::assertNull($job->user_id);
        self::assertTrue($job->expires_at?->isFuture());
        self::assertEqualsWithDelta(7, CarbonImmutable::now()->diffInDays($job->expires_at, true), 0.1);

        $asset = Asset::query()->where('print_job_id', $job->publicId())->firstOrFail();
        self::assertSame(PrintScenario::PHOTO_REF, $asset->ref);
        self::assertNull($asset->user_id);
        Storage::disk('local')->assertExists($asset->print_path);
        Storage::disk('local')->assertExists($asset->preview_path);

        // The job holds a copy of the edition and no IP address in the clear.
        self::assertSame('Zaterdagclub', $job->edition['name'] ?? null);
        self::assertStringNotContainsString('127.0.0.1', (string) json_encode($job->getAttributes()));
    }

    public function test_more_photos_can_follow_in_batches_for_a_partial_job(): void
    {
        $response = $this->post('/api/print-jobs', [
            'edition' => json_encode(PrintScenario::editionArray(), JSON_THROW_ON_ERROR),
            'partial' => '1',
            'photos' => [],
        ], ['Accept' => 'application/json'])->assertCreated();
        $token = PrintScenario::jsonString($response, 'token');

        $this->post('/api/print/' . $token . '/photos', [
            'photos' => [PrintScenario::PHOTO_REF => PrintScenario::photoUpload()],
        ], ['Accept' => 'application/json'])->assertCreated();

        $job = PrintJob::query()->where('token', $token)->firstOrFail();
        self::assertSame(1, Asset::query()->where('print_job_id', $job->publicId())->count());

        $this->post('/api/print/nope/photos', ['photos' => [PrintScenario::PHOTO_REF => PrintScenario::photoUpload()]], ['Accept' => 'application/json'])
            ->assertNotFound();
    }

    public function test_it_makes_nothing_until_asked_and_broadcasts_each_change_when_asked(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        self::assertSame(0, PrintScenario::renderer()->calls);

        Event::fake([PrintStatusUpdated::class]);
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        // waiting, running, done, and a final one when the run ends.
        Event::assertDispatched(PrintStatusUpdated::class, 4);
        Event::assertDispatched(PrintStatusUpdated::class, fn (PrintStatusUpdated $event): bool => $event->broadcastOn()->name === 'print-anon.' . $job->token
            && $event->broadcastAs() === 'print.status'
            && isset($event->broadcastWith()['parts']));
    }

    public function test_it_refuses_an_edition_that_is_not_json(): void
    {
        $this->post('/api/print-jobs', ['edition' => '{not json'], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('edition');

        self::assertSame(0, PrintJob::query()->count());
    }

    public function test_targets_say_which_photos_show_and_a_photo_without_target_need_not_be_sent(): void
    {
        $edition = PrintScenario::editionArray();
        $edition['elements'] = (array) $edition['elements'];
        $hidden = ['photoId' => 'photo-ref-hidden', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition['elements']['space.05'] = ['photo' => $hidden];

        $response = $this->post('/api/print-jobs', [
            'edition' => json_encode($edition, JSON_THROW_ON_ERROR),
            'photos' => [PrintScenario::PHOTO_REF => PrintScenario::photoUpload()],
            'targets' => json_encode(['printer' => ['space.01#photo' => ['w' => 40, 'h' => 70]], 'home' => ['space.01#photo' => ['w' => 45, 'h' => 75]]], JSON_THROW_ON_ERROR),
        ], ['Accept' => 'application/json'])->assertCreated();

        $job = PrintJob::query()->where('token', PrintScenario::jsonString($response, 'token'))->firstOrFail();

        self::assertSame(['w' => 45.0, 'h' => 75.0], $job->photo_targets['home']['space.01#photo'] ?? null);
    }

    public function test_without_targets_every_photo_of_the_edition_must_be_sent(): void
    {
        $edition = PrintScenario::editionArray();
        $edition['elements'] = (array) $edition['elements'];
        $edition['elements']['space.05'] = ['photo' => ['photoId' => 'photo-ref-hidden', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]];

        PrintScenario::postAnonymousJob($this, edition: $edition)->assertUnprocessable()->assertJsonValidationErrors('photos');
    }

    public function test_it_refuses_a_job_whose_edition_points_at_a_photo_that_was_not_sent(): void
    {
        PrintScenario::postAnonymousJob($this, photos: [])->assertUnprocessable()->assertJsonValidationErrors('photos');

        self::assertSame(0, PrintJob::query()->count());
    }

    public function test_it_refuses_a_photo_that_is_not_an_image_and_leaves_nothing_behind(): void
    {
        $fake = UploadedFile::fake()->createWithContent('foto.jpg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

        PrintScenario::postAnonymousJob($this, photos: [PrintScenario::PHOTO_REF => $fake])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('photos');

        self::assertSame(0, PrintJob::query()->count(), 'the job is removed again');
        self::assertSame(0, Asset::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles('assets'));
    }

    public function test_it_says_why_in_the_language_of_the_user(): void
    {
        $fake = UploadedFile::fake()->createWithContent('foto.jpg', 'plain text');

        $dutch = PrintScenario::postAnonymousJob($this->withHeader('Accept-Language', 'nl'), photos: [PrintScenario::PHOTO_REF => $fake]);
        $english = PrintScenario::postAnonymousJob($this->withHeader('Accept-Language', 'en'), photos: [PrintScenario::PHOTO_REF => $fake]);

        self::assertStringContainsString('JPEG, PNG, WebP of HEIC', PrintScenario::jsonString($dutch, 'errors.photos.0'));
        self::assertStringContainsString('pick a JPEG, PNG, WebP or HEIC', PrintScenario::jsonString($english, 'errors.photos.0'));
    }

    public function test_it_refuses_a_photo_ref_that_could_be_a_path(): void
    {
        PrintScenario::postAnonymousJob($this, photos: ['../../etc' => PrintScenario::photoUpload(), PrintScenario::PHOTO_REF => PrintScenario::photoUpload()])
            ->assertUnprocessable();

        self::assertSame(0, PrintJob::query()->count());
    }

    public function test_it_limits_the_number_of_photos_and_the_size_of_the_edition(): void
    {
        config(['printopoly.limits.anonymous_photos_per_job' => 1]);
        PrintScenario::postAnonymousJob($this, photos: [PrintScenario::PHOTO_REF => PrintScenario::photoUpload(), 'photo-ref-0002' => PrintScenario::photoUpload()])
            ->assertUnprocessable();

        config(['printopoly.limits.edition_json_kilobytes' => 1]);
        PrintScenario::postAnonymousJob($this, edition: [...PrintScenario::editionArray(), 'padding' => str_repeat('x', 3000)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('edition');
    }

    public function test_it_limits_active_jobs_per_ip_address(): void
    {
        config(['printopoly.limits.anonymous_jobs_per_ip' => 1]);

        $first = PrintScenario::createAnonymousJob($this);
        $first->forceFill(['active_at' => CarbonImmutable::now()])->save();

        PrintScenario::postAnonymousJob($this)->assertTooManyRequests();

        $first->forceFill(['active_at' => null])->save();
        PrintScenario::postAnonymousJob($this)->assertCreated();
    }

    public function test_the_photo_in_the_page_is_a_crop_at_most_300_dpi_with_rotation_and_grayscale_baked_in(): void
    {
        // The whole 800 x 600 photo on a 100 x 75 mm target (203 dpi), turned a quarter and grayscale.
        $edition = PrintScenario::editionWithBoardPhoto(['assetId' => PrintScenario::PHOTO_REF, 'x' => 0.5, 'y' => 0.5, 'scale' => 1, 'rotation' => 90, 'grayscale' => true, 'target' => ['w' => 75, 'h' => 100]]);
        $response = PrintScenario::postAnonymousJob($this, edition: $edition, photos: [PrintScenario::PHOTO_REF => UploadedFile::fake()->createWithContent('foto.jpg', TestImages::splitJpeg(800, 600))])->assertCreated();
        $job = PrintJob::query()->where('token', PrintScenario::jsonString($response, 'token'))->firstOrFail();

        $asset = Asset::query()->where('print_job_id', $job->publicId())->firstOrFail();
        $crop = new PhotoCropper()->crop($asset, new PhotoPlacement('space.01#photo', PrintScenario::PHOTO_REF, 0.5, 0.5, 1.0, 90, true, 75.0, 100.0));

        $size = getimagesizefromstring($crop);
        self::assertIsArray($size);
        // 600 x 800 after the turn is exactly the 75 x 100 target: 203 dpi, not scaled up.
        self::assertSame([600, 800], [$size[0], $size[1]]);

        $image = new Imagick();
        $image->readImageBlob($crop);
        // Left half red, right half blue: a clockwise turn puts the red half on top.
        $top = $image->getImagePixelColor(300, 100)->getColor();
        $bottom = $image->getImagePixelColor(300, 700)->getColor();
        self::assertGreaterThan($bottom['r'], $top['r'] + 1, 'grayscale: red (top) is lighter than blue (bottom)');
        self::assertEqualsWithDelta($top['r'], $top['b'], 4, 'grayscale: no colour left');
    }
}
