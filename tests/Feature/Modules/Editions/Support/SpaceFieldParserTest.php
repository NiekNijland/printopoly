<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Support\SpaceFieldParser;
use Tests\TestCase;

final class SpaceFieldParserTest extends TestCase
{
    public function test_only_the_four_corners_have_a_text(): void
    {
        $parser = resolve(SpaceFieldParser::class);

        self::assertSame([true, true, true, true, false, false], array_map($parser->isCorner(...), ['space.00', 'space.10', 'space.20', 'space.30', 'space.01', 'space.39']));
    }

    public function test_amounts_are_whole_numbers_of_this_space_within_their_range(): void
    {
        $errors = [];

        self::assertSame(['price' => 48, 'rent.1' => 12], resolve(SpaceFieldParser::class)->amounts('space.01', ['price' => 48.0, 'rent.1' => 12], 'at', $errors));
        self::assertNull(resolve(SpaceFieldParser::class)->amounts('space.01', ['price' => 47], 'at', $errors));
        self::assertSame(['at.price: must be between 48 and 72'], $errors);
    }

    public function test_a_deed_photo_is_a_flag_of_a_space_with_a_deed(): void
    {
        $errors = [];
        $parser = resolve(SpaceFieldParser::class);

        self::assertFalse($parser->deedPhoto('space.05', false, 'at', $errors));
        self::assertTrue($parser->deedPhoto('space.12', true, 'at', $errors));
        self::assertNull($parser->deedPhoto('space.00', true, 'at', $errors));
        self::assertSame(['at: only a street, station or utility has a deed'], $errors);
    }

    public function test_an_icon_is_a_preset_or_an_uploaded_image_with_its_shape(): void
    {
        $photo = ['photoId' => 'p', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $errors = [];
        $parser = resolve(SpaceFieldParser::class);

        self::assertSame(['preset' => 'lucide:ship'], $parser->icon('space.05', ['preset' => 'lucide:ship'], 'at', $errors));
        self::assertSame(['photo' => $photo, 'aspect' => 20], $parser->icon('space.00', ['photo' => $photo, 'aspect' => 20, 'extra' => 1], 'at', $errors));
        self::assertNull($parser->icon('space.04', [], 'at', $errors));
        self::assertSame(['at: aspect must be a number between 0.05 and 20'], $errors);
    }
}
