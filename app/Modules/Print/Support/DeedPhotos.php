<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Modules\Editions\Support\StandardEdition;

/**
 * Writes the photo of each street, station and utility onto its title deed where the deed shows it (B157): the
 * deed is cropped to its own frame, so it needs a placement of its own. A deed with its own photo keeps it, and
 * a space with `deedPhoto: false` keeps its photo off. With the pixel size of the photo the deed gets the crop
 * of its own narrow frame (B177, B218, B239), the same as `withDeedPhotos` and `deedCrop` in
 * resources/js/lib/render/edition-deed-photos.ts, so a stored edition prints as the editor shows it.
 */
final readonly class DeedPhotos
{
    /** The photo frame of a title deed in mm (B124, B218): `DEED_PHOTO` in resources/js/lib/render/edition-deed-photos.ts. */
    private const float DEED_PHOTO_WIDTH = 54.0;

    private const float DEED_PHOTO_HEIGHT = 16.5;

    /** The strip of a photo over the full width of a title deed, bleed included (B253): `DEED_FULL_PHOTO`. */
    private const float DEED_FULL_PHOTO_WIDTH = 69.0;

    private const float DEED_FULL_PHOTO_HEIGHT = 18.0;

    /** The height in a photo where faces usually are, a third from the top: `FACE_LINE` in lib/render/photos-transform.ts. */
    private const float FACE_LINE = 1 / 3;

    public function __construct(private StandardEdition $standard)
    {
    }

    /**
     * @param array<string, array<mixed>> $elements
     * @param array<string, array{width: int, height: int}> $photoSizes Pixel sizes by photo ref.
     * @return array<string, array<mixed>>
     */
    public function withDeedPhotos(array $elements, array $photoSizes = []): array
    {
        $index = 0;

        foreach ($this->standard->spaces() as $space) {
            if (! in_array($space['type'], ['street', 'station', 'utility'], true)) {
                continue;
            }

            $index++;
            $deedKey = sprintf('deed.%02d', $index);
            $deed = $elements[$deedKey] ?? [];
            $source = $elements[sprintf('space.%02d', $space['position'])] ?? [];

            if (isset($deed['photo']) || ! is_array($source['photo'] ?? null) || ($source['deedPhoto'] ?? true) === false) {
                continue;
            }

            $style = $deed['photoStyle'] ?? $source['photoStyle'] ?? null;
            $ref = $source['photo']['photoId'] ?? null;
            $deed['photo'] = self::deedCrop($source['photo'], is_string($ref) ? $photoSizes[$ref] ?? null : null, $style);

            if (! isset($deed['photoStyle']) && isset($source['photoStyle'])) {
                $deed['photoStyle'] = $source['photoStyle'];
            }

            $elements[$deedKey] = $deed;
        }

        return $elements;
    }

    /**
     * The crop of a borrowed photo on its title deed (B177, B218, B253), as `deedCrop` in deed-photos.ts. Every photo
     * fills the strip, landscape or standing. Untouched (a landscape photo in the middle at 100%, a standing photo at
     * 100%) it shows the upper part with the face line a third down the strip. A moved photo, a photo that fits (a
     * logo) and a photo of unknown size keep the crop of the space.
     *
     * @param array<mixed> $photo
     * @param array{width: int, height: int}|null $size
     * @return array<mixed>
     */
    public static function deedCrop(array $photo, ?array $size, mixed $style): array
    {
        unset($photo['borrowed']);

        if ($size === null || ($photo['fit'] ?? false) === true || $size['width'] <= 0 || $size['height'] <= 0) {
            return $photo;
        }

        $rotation = is_numeric($photo['rotation'] ?? null) ? (float) $photo['rotation'] : 0.0;
        $turned = ((int) round($rotation / 90)) % 2 !== 0;
        $width = $turned ? $size['height'] : $size['width'];
        $height = $turned ? $size['width'] : $size['height'];

        $cy = is_numeric($photo['cy'] ?? null) ? (float) $photo['cy'] : 0.5;
        $scale = is_numeric($photo['scale'] ?? null) ? (float) $photo['scale'] : 1.0;
        // A standing photo starts on its space with the face line set for that frame, so at 100% it always gets the
        // crop of the strip; a landscape photo only while it is in the middle.
        $untouched = $scale === 1.0 && ($cy === 0.5 || $height > $width);

        if (! $untouched) {
            return $photo;
        }

        $full = $style === 'full';

        return [
            ...$photo,
            'cx' => 0.5,
            'cy' => self::faceHeight(
                $width,
                $height,
                $full ? self::DEED_FULL_PHOTO_WIDTH : self::DEED_PHOTO_WIDTH,
                $full ? self::DEED_FULL_PHOTO_HEIGHT : self::DEED_PHOTO_HEIGHT,
            ),
        ];
    }

    /**
     * The height to centre a photo on so its face line lands a third from the top of the deed frame it covers at
     * 100%: `faceHeight` in lib/render/photos-transform.ts.
     */
    private static function faceHeight(int $width, int $height, float $frameWidth, float $frameHeight): float
    {
        $shown = min(1.0, ($frameHeight / $frameWidth) * ($width / $height));

        return self::FACE_LINE + $shown / 6;
    }
}
