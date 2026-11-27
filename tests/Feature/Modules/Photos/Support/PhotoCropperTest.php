<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Photos\Support;

use App\Models\Asset;
use App\Modules\Photos\Support\PhotoCropper;
use App\Modules\Photos\ValueObjects\PhotoCrop;
use App\Modules\Photos\ValueObjects\PhotoPlacement;
use App\Modules\Print\Enums\FailureReason;
use App\Modules\Print\Exceptions\PrintFailedException;
use Illuminate\Support\Facades\Storage;
use Imagick;
use RuntimeException;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\Support\TestImages;
use Tests\TestCase;

final class PhotoCropperTest extends TestCase
{
    use UsesLocalBoxDisk;

    public function test_a_crop_is_a_jpeg_of_the_planned_size_with_the_picture_the_right_way_round(): void
    {
        Storage::disk('local')->put('assets/molen/print.jpg', TestImages::splitJpeg(400, 200));
        $asset = $this->asset('assets/molen/print.jpg', 400, 200);
        $placement = $this->placement(rotation: 0, grayscale: false);

        $crop = resolve(PhotoCropper::class)->crop($asset, $placement);

        $plan = $this->plan($placement);
        $image = new Imagick();
        $image->readImageBlob($crop);
        self::assertSame('JPEG', $image->getImageFormat());
        self::assertSame([$plan->outputWidth, $plan->outputHeight], [$image->getImageWidth(), $image->getImageHeight()]);
        self::assertSame('red', $this->colour($image, 2));
        self::assertSame('blue', $this->colour($image, $image->getImageWidth() - 3));
    }

    public function test_a_turned_crop_puts_the_right_half_on_the_left(): void
    {
        Storage::disk('local')->put('assets/molen/print.jpg', TestImages::splitJpeg(400, 200));

        $crop = resolve(PhotoCropper::class)->crop($this->asset('assets/molen/print.jpg', 400, 200), $this->placement(rotation: 180, grayscale: false));

        $image = new Imagick();
        $image->readImageBlob($crop);
        self::assertSame('blue', $this->colour($image, 2));
        self::assertSame('red', $this->colour($image, $image->getImageWidth() - 3));
    }

    public function test_a_grayscale_crop_has_no_colour_left(): void
    {
        Storage::disk('local')->put('assets/molen/print.jpg', TestImages::splitJpeg(400, 200));

        $crop = resolve(PhotoCropper::class)->crop($this->asset('assets/molen/print.jpg', 400, 200), $this->placement(rotation: 0, grayscale: true));

        $image = new Imagick();
        $image->readImageBlob($crop);
        self::assertSame('gray', $this->colour($image, 2));
        self::assertSame('gray', $this->colour($image, $image->getImageWidth() - 3));
    }

    public function test_a_transparent_source_stays_a_png(): void
    {
        Storage::disk('local')->put('assets/logo/print.png', TestImages::png(400, 200));
        $asset = $this->asset('assets/logo/print.png', 400, 200);

        $crop = resolve(PhotoCropper::class)->crop($asset, $this->placement(rotation: 0, grayscale: false));

        self::assertSame('png', PhotoCropper::extension($asset));
        self::assertSame('jpg', PhotoCropper::extension($this->asset('assets/molen/print.jpg', 400, 200)));
        self::assertStringStartsWith("\x89PNG", $crop);
    }

    public function test_a_frame_without_a_size_is_a_photo_failure(): void
    {
        $placement = new PhotoPlacement('space.01', 'molen', 0.5, 0.5, 1.0, 0, false, null, 30.0);

        try {
            resolve(PhotoCropper::class)->crop($this->asset('assets/molen/print.jpg', 400, 200), $placement);
            self::fail('The crop did not fail.');
        } catch (PrintFailedException $printFailedException) {
            self::assertSame(FailureReason::Photos, $printFailedException->reason);
            self::assertStringContainsString('space.01', $printFailedException->getMessage());
        }
    }

    public function test_a_missing_print_source_stops_the_crop(): void
    {
        $this->expectException(RuntimeException::class);

        resolve(PhotoCropper::class)->crop($this->asset('assets/weg/print.jpg', 400, 200), $this->placement(rotation: 0, grayscale: false));
    }

    private function asset(string $printPath, int $width, int $height): Asset
    {
        return new Asset([
            'ref' => 'molen',
            'disk' => 'local',
            'preview_path' => dirname($printPath) . '/preview.webp',
            'print_path' => $printPath,
            'width' => $width,
            'height' => $height,
        ]);
    }

    private function placement(int $rotation, bool $grayscale): PhotoPlacement
    {
        $sideways = $rotation === 90 || $rotation === 270;

        return new PhotoPlacement('space.01', 'molen', 0.5, 0.5, 1.0, $rotation, $grayscale, $sideways ? 10.0 : 20.0, $sideways ? 20.0 : 10.0);
    }

    private function plan(PhotoPlacement $placement): PhotoCrop
    {
        return PhotoCrop::compute(
            photoWidth: 400,
            photoHeight: 200,
            x: $placement->x,
            y: $placement->y,
            scale: $placement->scale,
            rotation: $placement->rotation,
            grayscale: $placement->grayscale,
            targetWidthMm: (float) $placement->targetWidthMm,
            targetHeightMm: (float) $placement->targetHeightMm,
            maxDpi: 300,
            fit: $placement->fit,
        );
    }

    private function colour(Imagick $image, int $x): string
    {
        $pixel = $image->getImagePixelColor($x, intdiv($image->getImageHeight(), 2))->getColor();

        return match (true) {
            abs($pixel['r'] - $pixel['g']) < 12 && abs($pixel['g'] - $pixel['b']) < 12 => 'gray',
            $pixel['r'] > 200 && $pixel['b'] < 60 => 'red',
            $pixel['b'] > 200 && $pixel['r'] < 60 => 'blue',
            default => 'other',
        };
    }
}
