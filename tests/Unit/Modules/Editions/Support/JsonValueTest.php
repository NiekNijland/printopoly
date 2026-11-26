<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\JsonValue;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class JsonValueTest extends TestCase
{
    /**
     * @return iterable<string, array{mixed, bool, bool, bool}>
     */
    public static function values(): iterable
    {
        yield 'two accented letters' => ['éé', true, false, false];
        yield 'three letters' => ['abc', false, false, false];
        yield 'zero' => [0, false, true, false];
        yield 'a negative float' => [-1.5, false, true, false];
        yield 'infinity' => [INF, false, false, false];
        yield 'not a number' => [NAN, false, false, false];
        yield 'a number as text' => ['1', true, false, false];
        yield 'an empty array' => [[], false, false, true];
        yield 'a map' => [['a' => 1], false, false, true];
        yield 'a list that skips zero' => [[1 => 'a'], false, false, true];
        yield 'a list' => [['a'], false, false, false];
    }

    #[DataProvider('values')]
    public function test_a_decoded_value_is_a_short_string_a_number_or_an_object(mixed $value, bool $string, bool $number, bool $object): void
    {
        self::assertSame($string, JsonValue::isString($value, 2));
        self::assertSame($number, JsonValue::isNumber($value));
        self::assertSame($object, JsonValue::isObject($value));
    }
}
