<?php

declare(strict_types=1);

namespace App\Photos;

/**
 * The crop of one photo placement, worked out as docs/foto-uitsnede.md says.
 * The TypeScript side (resources/js/lib/photos/resolution.ts) uses the same
 * formulas; both must give the same numbers.
 *
 * Sizes `W` and `H` are those of the photo after EXIF orientation. Mm sizes
 * are the target area including bleed.
 */
final readonly class PhotoCrop
{
    /**
     * @param int $left Crop box in the upright photo, whole pixels, before rotation.
     * @param int $outputWidth Final pixels after rotation and scaling, never more than 300 dpi.
     */
    public function __construct(
        public int $left,
        public int $top,
        public int $width,
        public int $height,
        public int $rotation,
        public bool $grayscale,
        public int $outputWidth,
        public int $outputHeight,
        public float $dpi,
    ) {
    }

    public static function compute(
        int $photoWidth,
        int $photoHeight,
        float $x,
        float $y,
        float $scale,
        int $rotation,
        bool $grayscale,
        float $targetWidthMm,
        float $targetHeightMm,
        int $maxDpi = 300,
    ): self {
        $swap = $rotation === 90 || $rotation === 270;
        $rotatedWidth = $swap ? $photoHeight : $photoWidth;
        $rotatedHeight = $swap ? $photoWidth : $photoHeight;

        $cover = max($targetWidthMm / $rotatedWidth, $targetHeightMm / $rotatedHeight);
        $k = $cover * $scale;
        $dpi = 25.4 / $k;

        $visibleWidth = $targetWidthMm / $k;
        $visibleHeight = $targetHeightMm / $k;
        $u1 = self::clamp($x * $rotatedWidth - $visibleWidth / 2, 0, $rotatedWidth);
        $v1 = self::clamp($y * $rotatedHeight - $visibleHeight / 2, 0, $rotatedHeight);
        $u2 = self::clamp($x * $rotatedWidth + $visibleWidth / 2, 0, $rotatedWidth);
        $v2 = self::clamp($y * $rotatedHeight + $visibleHeight / 2, 0, $rotatedHeight);

        [$ax, $ay] = self::toOriginal($u1, $v1, $rotation, $photoWidth, $photoHeight);
        [$bx, $by] = self::toOriginal($u2, $v2, $rotation, $photoWidth, $photoHeight);

        $left = max(0, (int) floor(min($ax, $bx) + 1e-6));
        $top = max(0, (int) floor(min($ay, $by) + 1e-6));
        $right = min($photoWidth, (int) ceil(max($ax, $bx) - 1e-6));
        $bottom = min($photoHeight, (int) ceil(max($ay, $by) - 1e-6));

        $outputDpi = min((float) $maxDpi, $dpi);

        return new self(
            left: $left,
            top: $top,
            width: max(1, $right - $left),
            height: max(1, $bottom - $top),
            rotation: $rotation,
            grayscale: $grayscale,
            outputWidth: max(1, (int) round($targetWidthMm / 25.4 * $outputDpi)),
            outputHeight: max(1, (int) round($targetHeightMm / 25.4 * $outputDpi)),
            dpi: $dpi,
        );
    }

    /**
     * @return array{float, float}
     */
    private static function toOriginal(float $u, float $v, int $rotation, int $width, int $height): array
    {
        return match ($rotation) {
            90 => [$v, $height - $u],
            180 => [$width - $u, $height - $v],
            270 => [$width - $v, $u],
            default => [$u, $v],
        };
    }

    private static function clamp(float $value, float $min, float $max): float
    {
        return min($max, max($min, $value));
    }
}
