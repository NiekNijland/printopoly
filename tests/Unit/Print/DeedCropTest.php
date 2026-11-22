<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Print\PrintEditionData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * The server crops a borrowed photo on a title deed as the browser does (B239, `deedCrop` in
 * resources/js/lib/edition/deed-photos.ts). The numbers here are the ones `deed-photo-crop.test.ts` checks in the
 * browser, so both sides stay the same.
 */
final class DeedCropTest extends TestCase
{
    private const array PHOTO = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

    #[Test]
    public function an_untouched_landscape_photo_shows_its_upper_part_with_the_face_line_a_third_down(): void
    {
        $crop = PrintEditionData::deedCrop(self::PHOTO, ['width' => 800, 'height' => 600], null);

        self::assertEqualsWithDelta(0.401235, $crop['cy'], 0.000001);
        self::assertSame(0.5, $crop['cx']);
        self::assertArrayNotHasKey('fit', $crop);
    }

    #[Test]
    public function a_standing_photo_fits_zoomed_in_on_its_top(): void
    {
        $crop = PrintEditionData::deedCrop(self::PHOTO, ['width' => 600, 'height' => 800], null);

        self::assertSame([...self::PHOTO, 'cx' => 0.5, 'cy' => 0, 'scale' => 1.8, 'fit' => true], $crop);
    }

    #[Test]
    public function a_quarter_turn_makes_a_landscape_photo_standing(): void
    {
        $crop = PrintEditionData::deedCrop([...self::PHOTO, 'rotation' => 90], ['width' => 800, 'height' => 600], null);

        self::assertTrue($crop['fit']);
        self::assertSame(1.8, $crop['scale']);
    }

    #[Test]
    public function a_moved_photo_a_full_photo_a_fitted_photo_and_an_unknown_size_keep_the_crop_of_the_space(): void
    {
        $moved = [...self::PHOTO, 'cy' => 0.2];

        self::assertSame($moved, PrintEditionData::deedCrop($moved, ['width' => 800, 'height' => 600], null));
        self::assertSame(self::PHOTO, PrintEditionData::deedCrop(self::PHOTO, ['width' => 600, 'height' => 800], 'full'));
        self::assertSame([...self::PHOTO, 'fit' => true], PrintEditionData::deedCrop([...self::PHOTO, 'fit' => true], ['width' => 600, 'height' => 800], null));
        self::assertSame(self::PHOTO, PrintEditionData::deedCrop([...self::PHOTO, 'borrowed' => true], null, null));
    }

    #[Test]
    public function a_deed_that_borrows_a_photo_gets_the_crop_of_its_own_frame_when_the_size_is_known(): void
    {
        $elements = PrintEditionData::withDeedPhotos(
            ['space.01' => ['photo' => self::PHOTO], 'space.03' => ['photo' => [...self::PHOTO, 'photoId' => 'photo-ref-0002']]],
            ['photo-ref-0001' => ['width' => 600, 'height' => 800]],
        );

        self::assertTrue($elements['deed.01']['photo']['fit'] ?? null);
        // Without a size the deed keeps the crop of its space, as before.
        self::assertSame([...self::PHOTO, 'photoId' => 'photo-ref-0002'], $elements['deed.02']['photo'] ?? null);
    }
}
