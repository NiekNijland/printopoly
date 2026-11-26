<?php

declare(strict_types=1);

namespace App\Modules\Photos\Support;

use App\Models\Asset;
use App\Modules\Photos\ValueObjects\PhotoCrop;
use App\Modules\Photos\ValueObjects\PhotoPlacement;
use App\Modules\Print\Enums\FailureReason;
use App\Modules\Print\Exceptions\PrintFailedException;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Imagick\Driver;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\Encoders\PngEncoder;
use Intervention\Image\ImageManager;
use RuntimeException;

/**
 * Cuts one placement out of the print source (B61): crop, then rotate, then
 * grayscale, then scale to at most 300 dpi including bleed. Rotation and
 * grayscale are baked in because Chrome renders CSS filters as raster.
 */
final readonly class PhotoCropper
{
    private ImageManager $images;

    public function __construct()
    {
        $this->images = new ImageManager(new Driver());
    }

    /**
     * File extension of the crop of this asset: a transparent source stays a PNG (B125).
     */
    public static function extension(Asset $asset): string
    {
        return self::isTransparent($asset) ? 'png' : 'jpg';
    }

    private static function isTransparent(Asset $asset): bool
    {
        return str_ends_with($asset->print_path, '.png');
    }

    /**
     * @throws PrintFailedException
     */
    public function crop(Asset $asset, PhotoPlacement $placement): string
    {
        if ($placement->targetWidthMm === null || $placement->targetHeightMm === null) {
            throw new PrintFailedException('The frame of photo ' . $placement->key . ' has no size: the renderer geometry is not connected yet.', reason: FailureReason::Photos);
        }

        $plan = PhotoCrop::compute(
            photoWidth: $asset->width,
            photoHeight: $asset->height,
            x: $placement->x,
            y: $placement->y,
            scale: $placement->scale,
            rotation: $placement->rotation,
            grayscale: $placement->grayscale,
            targetWidthMm: $placement->targetWidthMm,
            targetHeightMm: $placement->targetHeightMm,
            maxDpi: config()->integer('printopoly.photos.max_dpi'),
            fit: $placement->fit,
        );

        $source = Storage::disk($asset->disk)->get($asset->print_path);

        throw_if($source === null, RuntimeException::class, 'The print source of a photo is missing.');

        $image = $this->images->decodeBinary($source)->crop($plan->width, $plan->height, $plan->left, $plan->top);

        if ($plan->rotation !== 0) {
            // Imagick turns clockwise for a positive angle, which is what the spec means.
            $image->rotate($plan->rotation);
        }

        if ($plan->grayscale) {
            $image->grayscale();
        }

        $image->resize($plan->outputWidth, $plan->outputHeight);

        return (string) $image->encode(self::isTransparent($asset) ? new PngEncoder() : new JpegEncoder(92, strip: true));
    }
}
