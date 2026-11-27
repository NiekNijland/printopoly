<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\BoardProfileParser;
use PHPUnit\Framework\TestCase;

final class BoardProfileParserTest extends TestCase
{
    private const array PROFILE = ['id' => 'square', 'name' => 'Vierkant', 'outer' => 500, 'corner' => 70, 'border' => 0, 'panels' => 4, 'boxLid' => ['w' => 267, 'h' => 267]];

    public function test_a_profile_keeps_its_fields_and_only_a_true_provisional(): void
    {
        $errors = [];

        self::assertSame(self::PROFILE, new BoardProfileParser()->parse([...self::PROFILE, 'provisional' => 'yes', 'extra' => 1], $errors));
        self::assertSame([...self::PROFILE, 'provisional' => true], new BoardProfileParser()->parse([...self::PROFILE, 'provisional' => true], $errors));
        self::assertSame([], $errors);
    }

    public function test_the_smallest_board_that_fits_nine_spaces_and_two_corners(): void
    {
        $errors = [];

        self::assertNotNull(new BoardProfileParser()->parse([...self::PROFILE, 'outer' => 275, 'border' => 0], $errors));
        self::assertNull(new BoardProfileParser()->parse([...self::PROFILE, 'outer' => 274.9], $errors));
        self::assertSame(['boardProfile: a corner space plus 9 spaces does not fit the board'], $errors);
    }

    public function test_a_profile_that_is_no_object_is_refused(): void
    {
        $errors = [];

        self::assertNull(new BoardProfileParser()->parse('square', $errors));
        self::assertSame(['boardProfile: must be an object'], $errors);
    }
}
