<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Photos\Support;

use App\Models\Asset;
use App\Models\Edition;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use App\Modules\Photos\Support\PhotoStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\Support\TestImages;
use Tests\TestCase;

final class PhotoStoreTest extends TestCase
{
    use RefreshesMongoDatabase;
    use UsesLocalBoxDisk;

    public function test_a_photo_of_an_account_keeps_two_derived_images_and_an_asset(): void
    {
        $user = User::factory()->createOne();
        $edition = Edition::factory()->createOne(['edition_id' => 'e1']);

        $file = $this->file(TestImages::jpeg(800, 600));
        $asset = resolve(PhotoStore::class)->storeForUser((string) $file->getRealPath(), 'molen', $user, $edition);

        $stored = Asset::query()->whereKey($asset->id)->firstOrFail();
        $disk = Storage::disk('local');
        $print = (string) $disk->get($stored->print_path);
        self::assertSame('molen', $stored->ref);
        self::assertSame($user->publicId(), $stored->user_id);
        self::assertSame('e1', $stored->edition_id);
        self::assertNull($stored->print_job_id);
        self::assertSame('local', $stored->disk);
        self::assertMatchesRegularExpression('#^assets/[0-9A-Z]{26}/preview\.webp$#', $stored->preview_path);
        self::assertSame(dirname($stored->preview_path) . '/print.jpg', $stored->print_path);
        self::assertSame([800, 600, 800, 600], [$stored->width, $stored->height, $stored->original_width, $stored->original_height]);
        self::assertSame(hash('sha256', $print), $stored->checksum);
        self::assertSame(strlen((string) $disk->get($stored->preview_path)) + strlen($print), $stored->bytes);
    }

    public function test_a_transparent_photo_keeps_a_png_print_source(): void
    {
        $file = $this->file(TestImages::png(400, 300));
        $asset = resolve(PhotoStore::class)->storeForUser((string) $file->getRealPath(), 'logo', User::factory()->createOne(), Edition::factory()->createOne());

        self::assertStringEndsWith('/print.png', $asset->print_path);
        Storage::disk('local')->assertExists($asset->print_path);
    }

    public function test_a_photo_of_a_job_without_an_account_expires_with_the_job(): void
    {
        $job = PrintJob::factory()->createOne(['expires_at' => now()->addDays(7)->toImmutable()]);

        $file = $this->file(TestImages::jpeg(200, 100));
        $asset = resolve(PhotoStore::class)->storeForJob((string) $file->getRealPath(), 'kaart', $job);

        self::assertSame($job->publicId(), $asset->print_job_id);
        self::assertNull($asset->user_id);
        self::assertSame(now()->addDays(7)->toDateTimeString(), $asset->expires_at?->toDateTimeString());
    }

    public function test_a_file_that_is_no_picture_stores_nothing(): void
    {
        $store = resolve(PhotoStore::class);

        try {
            $file = $this->file('geen foto maar tekst');
            $store->storeForUser((string) $file->getRealPath(), 'tekst', User::factory()->createOne(), Edition::factory()->createOne());
            self::fail('The file was not refused.');
        } catch (PhotoRejectedException $photoRejectedException) {
            self::assertSame('photo.wrong_type', $photoRejectedException->translationKey);
        }

        self::assertSame(0, Asset::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_the_disk_comes_from_the_config(): void
    {
        config(['printopoly.storage.disk' => 'kluis']);

        self::assertSame('kluis', resolve(PhotoStore::class)->diskName());
    }

    public function test_deleting_an_asset_removes_its_files_and_keeps_the_others(): void
    {
        $store = resolve(PhotoStore::class);
        $user = User::factory()->createOne();
        $edition = Edition::factory()->createOne();
        $first = $this->file(TestImages::jpeg(200, 100));
        $gone = $store->storeForUser((string) $first->getRealPath(), 'molen', $user, $edition);
        $second = $this->file(TestImages::jpeg(200, 100));
        $kept = $store->storeForUser((string) $second->getRealPath(), 'stel', $user, $edition);

        $store->delete($gone);

        self::assertSame([$kept->id], Asset::query()->pluck('id')->all());
        Storage::disk('local')->assertMissing([$gone->preview_path, $gone->print_path]);
        Storage::disk('local')->assertExists([$kept->preview_path, $kept->print_path]);
    }

    private function file(string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('vakantie.jpg', $content);
    }
}
