<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\PhotoParser;
use PHPUnit\Framework\TestCase;

final class PhotoParserTest extends TestCase
{
    private const array PHOTO = ['photoId' => 'p', 'cx' => 0, 'cy' => 1, 'scale' => 0.1, 'rotation' => -90, 'grayscale' => true];

    public function test_a_photo_keeps_its_fields_and_drops_the_rest(): void
    {
        $errors = [];

        self::assertSame(self::PHOTO, new PhotoParser()->parse([...self::PHOTO, 'fit' => false, 'extra' => 1], 'photo', $errors));
        self::assertSame([...self::PHOTO, 'fit' => true], new PhotoParser()->parse([...self::PHOTO, 'fit' => true], 'photo', $errors));
        self::assertSame([], $errors);
    }

    public function test_a_wrong_photo_names_every_problem_under_its_path(): void
    {
        $errors = ['earlier'];

        self::assertNull(new PhotoParser()->parse(['cx' => -1, 'cy' => 0, 'scale' => -1, 'grayscale' => 'no'], 'a.b', $errors));
        self::assertSame([
            'earlier',
            'a.b: photoId must be a non-empty string',
            'a.b: cx and cy must be between 0 and 1',
            'a.b: scale must be greater than 0',
            'a.b: rotation must be a number',
            'a.b: grayscale must be a boolean',
        ], $errors);
    }

    public function test_a_photo_that_is_no_object_is_refused(): void
    {
        $errors = [];

        self::assertNull(new PhotoParser()->parse(['p'], 'a', $errors));
        self::assertSame(['a: photo must be an object'], $errors);
    }
}
