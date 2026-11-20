<?php

declare(strict_types=1);

namespace Tests\Unit\Photos;

use App\Photos\PhotoCrop;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * The same cases as resources/js/lib/photos/resolution.test.ts: both sides
 * must give the same numbers (docs/foto-uitsnede.md).
 */
final class PhotoCropTest extends TestCase
{
    #[Test]
    public function it_crops_the_example_of_the_spec(): void
    {
        $crop = PhotoCrop::compute(4000, 3000, 0.5, 0.5, 2, 0, false, 80, 60);

        self::assertSame([1000, 750, 2000, 1500], [$crop->left, $crop->top, $crop->width, $crop->height]);
        self::assertEqualsWithDelta(635.0, $crop->dpi, 0.001);
        self::assertSame([945, 709], [$crop->outputWidth, $crop->outputHeight]);
    }

    #[Test]
    public function it_uses_the_whole_photo_at_full_cover_and_caps_at_300_dpi(): void
    {
        $crop = PhotoCrop::compute(1800, 1200, 0.5, 0.5, 1, 0, false, 90, 60);

        self::assertSame([0, 0, 1800, 1200], [$crop->left, $crop->top, $crop->width, $crop->height]);
        self::assertEqualsWithDelta(508, $crop->dpi, 0.5);
        self::assertSame([1063, 709], [$crop->outputWidth, $crop->outputHeight]);
    }

    #[Test]
    public function it_never_upsamples(): void
    {
        $crop = PhotoCrop::compute(900, 600, 0.5, 0.5, 1, 0, false, 90, 60);

        self::assertEqualsWithDelta(254, $crop->dpi, 0.001);
        self::assertSame(900, $crop->outputWidth);
        self::assertSame(600, $crop->outputHeight);
    }

    #[Test]
    public function it_keeps_a_panned_window_inside_the_photo(): void
    {
        // The centre is past the valid range (0.75 at most): the window is cut off at the photo's edge.
        $crop = PhotoCrop::compute(4000, 3000, 0.9, 0.5, 2, 0, false, 80, 60);

        self::assertSame(4000, $crop->left + $crop->width);
        self::assertSame(2600, $crop->left);
    }

    #[Test]
    public function it_maps_quarter_turns_back_to_the_upright_photo(): void
    {
        // 90: rotated photo is 3000 x 4000, exactly the shape of a 60 x 80 target: the whole photo.
        $whole = PhotoCrop::compute(4000, 3000, 0.5, 0.5, 1, 90, false, 60, 80);
        self::assertSame([0, 0, 4000, 3000], [$whole->left, $whole->top, $whole->width, $whole->height]);
        self::assertSame(90, $whole->rotation);

        // 180: top-left of the turned photo is the bottom-right of the original.
        $turned = PhotoCrop::compute(4000, 3000, 0.25, 0.25, 2, 180, false, 80, 60);
        self::assertSame([2000, 1500, 2000, 1500], [$turned->left, $turned->top, $turned->width, $turned->height]);

        // 270: top-left of the turned photo is the top-right of the original.
        $quarter = PhotoCrop::compute(4000, 3000, 0.25, 0.25, 2, 270, false, 60, 80);
        self::assertSame([2000, 0, 2000, 1500], [$quarter->left, $quarter->top, $quarter->width, $quarter->height]);
    }

    #[Test]
    public function it_carries_grayscale(): void
    {
        self::assertTrue(PhotoCrop::compute(1000, 1000, 0.5, 0.5, 1, 0, true, 50, 50)->grayscale);
        self::assertFalse(PhotoCrop::compute(1000, 1000, 0.5, 0.5, 1, 0, false, 50, 50)->grayscale);
    }
}
