<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Photos\Support;

use App\Modules\Photos\Exceptions\PhotoRejectedException;
use App\Modules\Photos\Support\PhotoProcessor;
use Illuminate\Support\Facades\File;
use Imagick;
use ImagickPixel;
use Override;
use Tests\Support\TestImages;
use Tests\TestCase;

final class PhotoProcessorTest extends TestCase
{
    /** @var list<string> */
    private array $files = [];

    #[Override]
    protected function tearDown(): void
    {
        foreach ($this->files as $file) {
            if (is_file($file)) {
                File::delete($file);
            }
        }

        parent::tearDown();
    }

    public function test_it_makes_a_webp_preview_and_a_jpeg_print_source(): void
    {
        $result = new PhotoProcessor()->process($this->file(TestImages::jpeg(2400, 1600)));

        $preview = getimagesizefromstring($result->preview);
        $print = getimagesizefromstring($result->printSource);

        self::assertIsArray($preview);
        self::assertIsArray($print);
        self::assertSame('image/webp', $preview['mime']);
        self::assertSame(1600, $preview[0]);
        self::assertSame(1067, $preview[1]);
        self::assertSame('image/jpeg', $print['mime']);
        self::assertSame([2400, 1600], [$result->printWidth, $result->printHeight], 'under 8000 px: not scaled');
    }

    public function test_a_picture_with_transparent_areas_keeps_a_png_print_source(): void
    {
        $result = new PhotoProcessor()->process($this->file(TestImages::png(400, 300)));
        $print = getimagesizefromstring($result->printSource);

        self::assertTrue($result->transparent);
        self::assertIsArray($print);
        self::assertSame('image/png', $print['mime']);
    }

    public function test_an_opaque_png_becomes_a_jpeg_print_source(): void
    {
        $image = new Imagick();
        $image->newImage(400, 300, new ImagickPixel('#0072bb'));
        $image->setImageFormat('png');

        $result = new PhotoProcessor()->process($this->file($image->getImageBlob()));

        self::assertFalse($result->transparent);
        self::assertSame('image/jpeg', getimagesizefromstring($result->printSource)['mime'] ?? null);
    }

    public function test_it_limits_the_print_source_to_8000_px_and_never_scales_up(): void
    {
        config(['printopoly.photos.print_edge' => 1000, 'printopoly.photos.preview_edge' => 500]);

        $big = new PhotoProcessor()->process($this->file(TestImages::jpeg(2000, 1000)));
        self::assertSame([1000, 500], [$big->printWidth, $big->printHeight]);

        $small = new PhotoProcessor()->process($this->file(TestImages::jpeg(300, 200)));
        self::assertSame([300, 200], [$small->printWidth, $small->printHeight]);
    }

    public function test_it_turns_the_photo_upright_by_its_exif_orientation(): void
    {
        // Orientation 6: the camera was turned, the pixels are 300 x 200 but the photo is 200 x 300.
        $result = new PhotoProcessor()->process($this->file(TestImages::jpeg(300, 200, orientation: 6)));

        self::assertSame([200, 300], [$result->originalWidth, $result->originalHeight]);
        self::assertSame([200, 300], [$result->printWidth, $result->printHeight]);
    }

    public function test_it_strips_exif_and_location(): void
    {
        $source = TestImages::jpeg(300, 200, make: 'SecretCamera');
        self::assertStringContainsString('SecretCamera', $source, 'the test image really carries EXIF');

        $result = new PhotoProcessor()->process($this->file($source));

        self::assertStringNotContainsString('SecretCamera', $result->printSource);
        self::assertStringNotContainsString('SecretCamera', $result->preview);
        self::assertStringNotContainsString('Exif', $result->printSource);
    }

    public function test_it_decides_the_type_by_content_not_by_name(): void
    {
        foreach ([
            'text' => 'just some text',
            'svg' => '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>',
            'gif' => base64_decode('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', true),
            'php' => '<?php echo 1;',
        ] as $label => $contents) {
            try {
                new PhotoProcessor()->process($this->file((string) $contents));
                self::fail($label . ' should have been refused');
            } catch (PhotoRejectedException $rejected) {
                self::assertSame('photo.wrong_type', $rejected->translationKey, $label);
            }
        }
    }

    public function test_it_refuses_too_many_pixels_before_decoding(): void
    {
        config(['printopoly.limits.photo_max_megapixels' => 1]);

        try {
            new PhotoProcessor()->process($this->file(TestImages::jpeg(1500, 1000)));
            self::fail('1.5 MP should be refused at a 1 MP limit');
        } catch (PhotoRejectedException $photoRejectedException) {
            self::assertSame('photo.too_many_pixels', $photoRejectedException->translationKey);
            self::assertSame(['mp' => 1], $photoRejectedException->replacements);
        }
    }

    public function test_it_refuses_a_file_over_the_size_limit(): void
    {
        config(['printopoly.limits.photo_max_megabytes' => 0]);

        $this->expectException(PhotoRejectedException::class);

        new PhotoProcessor()->process($this->file(TestImages::jpeg(100, 100)));
    }

    public function test_it_has_a_message_in_both_languages(): void
    {
        app()->setLocale('nl');
        self::assertStringContainsString('JPEG', PhotoRejectedException::wrongType()->translated());

        app()->setLocale('en');
        self::assertStringContainsString('JPEG', PhotoRejectedException::wrongType()->translated());
        self::assertStringContainsString('25', PhotoRejectedException::tooLarge(25)->translated());
    }

    private function file(string $contents): string
    {
        $path = (string) tempnam(sys_get_temp_dir(), 'photo-test-');
        file_put_contents($path, $contents);
        $this->files[] = $path;

        return $path;
    }
}
