<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Support;

use App\Models\CollectionBox;
use App\Modules\Boxes\Support\BoxPhotos;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\Support\BoxScenario;
use Tests\TestCase;

final class BoxPhotosTest extends TestCase
{
    use RefreshesMongoDatabase;
    use UsesLocalBoxDisk;

    public function test_it_keeps_a_preview_and_a_print_source_in_a_folder_of_the_box(): void
    {
        $box = CollectionBox::factory()->createOne();

        $stored = resolve(BoxPhotos::class)->store(BoxScenario::photo(), $box);

        $disk = Storage::disk('local');
        self::assertSame('local', $stored['disk']);
        self::assertMatchesRegularExpression('#^box-photos/' . $box->publicId() . '/[0-9A-Z]{26}/preview\.webp$#', $stored['preview_path']);
        self::assertSame(dirname($stored['preview_path']) . '/print.jpg', $stored['print_path']);
        self::assertSame([800, 600], [$stored['width'], $stored['height']]);
        self::assertSame(mb_strlen((string) $disk->get($stored['preview_path']), '8bit') + mb_strlen((string) $disk->get($stored['print_path']), '8bit'), $stored['bytes']);
        self::assertCount(2, $disk->allFiles('box-photos'));
    }

    public function test_a_photo_over_the_limit_for_friends_is_refused_before_it_is_read(): void
    {
        config(['printopoly.boxes.photo_max_megabytes' => 1]);
        $box = CollectionBox::factory()->createOne();

        $rejected = $this->rejection(UploadedFile::fake()->create('groot.jpg', 1025, 'image/jpeg'), $box);

        self::assertSame('photo.too_large', $rejected->translationKey);
        self::assertSame(['mb' => 1], $rejected->replacements);
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_a_broken_upload_is_refused(): void
    {
        $box = CollectionBox::factory()->createOne();
        $file = BoxScenario::photo();
        $broken = new UploadedFile((string) $file->getRealPath(), 'vakantie.jpg', 'image/jpeg', UPLOAD_ERR_PARTIAL, true);

        self::assertSame('photo.too_large', $this->rejection($broken, $box)->translationKey);
    }

    public function test_a_file_that_is_no_picture_is_refused_and_nothing_is_kept(): void
    {
        $box = CollectionBox::factory()->createOne();

        $rejected = $this->rejection(UploadedFile::fake()->createWithContent('vakantie.jpg', 'geen foto maar tekst'), $box);

        self::assertSame('photo.wrong_type', $rejected->translationKey);
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    private function rejection(UploadedFile $file, CollectionBox $box): PhotoRejectedException
    {
        try {
            resolve(BoxPhotos::class)->store($file, $box);
        } catch (PhotoRejectedException $photoRejectedException) {
            return $photoRejectedException;
        }

        self::fail('The photo was not refused.');
    }
}
