<?php

declare(strict_types=1);

namespace App\Modules\Photos\ValueObjects;

/**
 * The crop of one photo placement, worked out as docs/archive/foto-uitsnede.md says.
 * The TypeScript side (resources/js/lib/render/photos-resolution.ts) uses the same
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
        bool $fit = false,
    ): self {
        $swap = $rotation === 90 || $rotation === 270;
        $rotatedWidth = $swap ? $photoHeight : $photoWidth;
        $rotatedHeight = $swap ? $photoWidth : $photoHeight;

        // A photo that fits (B168) is measured against "contain": the whole photo inside the frame at 100%.
        $base = $fit
            ? min($targetWidthMm / $rotatedWidth, $targetHeightMm / $rotatedHeight)
            : max($targetWidthMm / $rotatedWidth, $targetHeightMm / $rotatedHeight);
        $k = $base * $scale;
        $dpi = 25.4 / $k;

        $visibleWidth = $targetWidthMm / $k;
        $visibleHeight = $targetHeightMm / $k;
        // The point in the middle stays where the visible area fits on the photo: a placement made for another
        // frame (a deed showing the photo of its space, B157) or a start at the top third (ronde 3) never shows
        // an edge. Where the area is wider than the photo, it is centred. The same as clampTransform in transform.ts.
        $x = self::centre($x, $visibleWidth / 2 / $rotatedWidth);
        $y = self::centre($y, $visibleHeight / 2 / $rotatedHeight);
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
        // When it fits, the crop may be smaller than the frame: the output is the visible part at its own size,
        // and the renderer draws it whole in the middle of the frame.
        $outputWidthMm = $fit ? ($u2 - $u1) * $k : $targetWidthMm;
        $outputHeightMm = $fit ? ($v2 - $v1) * $k : $targetHeightMm;

        return new self(
            left: $left,
            top: $top,
            width: max(1, $right - $left),
            height: max(1, $bottom - $top),
            rotation: $rotation,
            grayscale: $grayscale,
            outputWidth: max(1, (int) round($outputWidthMm / 25.4 * $outputDpi)),
            outputHeight: max(1, (int) round($outputHeightMm / 25.4 * $outputDpi)),
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

    private static function centre(float $value, float $half): float
    {
        if ($half >= 0.5 - 1e-9) {
            return 0.5;
        }

        return min(1 - $half, max($half, $value));
    }

    private static function clamp(float $value, float $min, float $max): float
    {
        return min($max, max($min, $value));
    }
}
