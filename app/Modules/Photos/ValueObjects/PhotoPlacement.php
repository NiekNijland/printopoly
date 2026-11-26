<?php

declare(strict_types=1);

namespace App\Modules\Photos\ValueObjects;

/**
 * One photo in one element of an edition: which photo, how it sits in its
 * frame (docs/archive/foto-uitsnede.md) and, when known, how large the frame is in mm
 * including bleed.
 *
 * An edition stores `photo: {photoId, cx, cy, scale, rotation, grayscale}` on
 * an element (resources/js/lib/edition/types.ts), and the same on photo layers,
 * where the layer's own w and h are the frame. The size of the frame of an
 * element comes from the renderer's geometry; until the real renderers are
 * connected, a placement without a size cannot be cropped. A placement may
 * carry `target: {w, h}` to say it. `fit: true` means the whole photo fits
 * inside the frame instead of filling it (B168).
 */
final readonly class PhotoPlacement
{
    public function __construct(
        public string $key,
        public string $assetRef,
        public float $x,
        public float $y,
        public float $scale,
        public int $rotation,
        public bool $grayscale,
        public ?float $targetWidthMm,
        public ?float $targetHeightMm,
        public bool $fit = false,
    ) {
    }

    /**
     * @param array<mixed> $photo A `photo` object of an element or a layer.
     * @param array<mixed>|null $frame The layer, whose `w` and `h` are the frame.
     */
    public static function fromArray(string $key, array $photo, ?array $frame = null): ?self
    {
        $ref = $photo['photoId'] ?? $photo['assetId'] ?? null;

        if (! is_string($ref)) {
            return null;
        }

        $target = is_array($photo['target'] ?? null) ? $photo['target'] : [];
        $width = $target['w'] ?? $frame['w'] ?? null;
        $height = $target['h'] ?? $frame['h'] ?? null;
        $rotation = $photo['rotation'] ?? 0;

        return new self(
            key: $key,
            assetRef: $ref,
            x: self::number($photo['cx'] ?? $photo['x'] ?? null, 0.5),
            y: self::number($photo['cy'] ?? $photo['y'] ?? null, 0.5),
            scale: max(0.1, self::number($photo['scale'] ?? null, 1.0)),
            rotation: is_numeric($rotation) && in_array((int) $rotation, [0, 90, 180, 270], true) ? (int) $rotation : 0,
            grayscale: ($photo['grayscale'] ?? false) === true,
            targetWidthMm: is_numeric($width) && (float) $width > 0 ? (float) $width : null,
            targetHeightMm: is_numeric($height) && (float) $height > 0 ? (float) $height : null,
            fit: ($photo['fit'] ?? false) === true,
        );
    }

    private static function number(mixed $value, float $default): float
    {
        return is_numeric($value) ? (float) $value : $default;
    }
}
