<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Print\Support\DeedPhotos;
use Tests\TestCase;

/**
 * The server crops a borrowed photo on a title deed as the browser does (B239, `deedCrop` in
 * resources/js/lib/render/edition-deed-photos.ts). The numbers here are the ones `deed-photo-crop.test.ts` checks in the
 * browser, so both sides stay the same.
 */
final class DeedPhotosTest extends TestCase
{
    private const array PHOTO = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

    public function test_an_untouched_landscape_photo_shows_its_upper_part_with_the_face_line_a_third_down(): void
    {
        $crop = DeedPhotos::deedCrop(self::PHOTO, ['width' => 800, 'height' => 600], null);

        self::assertEqualsWithDelta(0.401235, $crop['cy'], 0.000001);
        self::assertSame(0.5, $crop['cx']);
        self::assertArrayNotHasKey('fit', $crop);
    }

    public function test_a_standing_photo_fills_the_strip_with_the_face_line_a_third_down(): void
    {
        $crop = DeedPhotos::deedCrop(self::PHOTO, ['width' => 600, 'height' => 800], null);

        self::assertEqualsWithDelta(0.371528, $crop['cy'], 0.000001);
        self::assertSame(1, $crop['scale']);
        self::assertArrayNotHasKey('fit', $crop);
    }

    public function test_a_photo_over_the_full_width_is_cropped_on_its_own_wider_strip(): void
    {
        $crop = DeedPhotos::deedCrop(self::PHOTO, ['width' => 600, 'height' => 800], 'full');

        self::assertEqualsWithDelta(0.365942, $crop['cy'], 0.000001);
        self::assertArrayNotHasKey('fit', $crop);
    }

    public function test_a_quarter_turn_makes_a_landscape_photo_standing(): void
    {
        $crop = DeedPhotos::deedCrop([...self::PHOTO, 'rotation' => 90], ['width' => 800, 'height' => 600], null);

        self::assertEqualsWithDelta(0.371528, $crop['cy'], 0.000001);
        self::assertArrayNotHasKey('fit', $crop);
    }

    public function test_a_moved_photo_a_fitted_photo_and_an_unknown_size_keep_the_crop_of_the_space(): void
    {
        $moved = [...self::PHOTO, 'cy' => 0.2];

        self::assertSame($moved, DeedPhotos::deedCrop($moved, ['width' => 800, 'height' => 600], null));
        self::assertSame([...self::PHOTO, 'fit' => true], DeedPhotos::deedCrop([...self::PHOTO, 'fit' => true], ['width' => 600, 'height' => 800], null));
        self::assertSame(self::PHOTO, DeedPhotos::deedCrop([...self::PHOTO, 'borrowed' => true], null, null));
    }

    public function test_a_deed_that_borrows_a_photo_gets_the_crop_of_its_own_frame_when_the_size_is_known(): void
    {
        $elements = resolve(DeedPhotos::class)->withDeedPhotos(
            ['space.01' => ['photo' => self::PHOTO], 'space.03' => ['photo' => [...self::PHOTO, 'photoId' => 'photo-ref-0002']]],
            ['photo-ref-0001' => ['width' => 600, 'height' => 800]],
        );

        $photo = $elements['deed.01']['photo'] ?? null;
        self::assertIsArray($photo);
        self::assertEqualsWithDelta(0.371528, $photo['cy'] ?? null, 0.000001);
        // Without a size the deed keeps the crop of its space, as before.
        self::assertSame([...self::PHOTO, 'photoId' => 'photo-ref-0002'], $elements['deed.02']['photo'] ?? null);
    }
}
