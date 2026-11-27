<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\JsonShape;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use UnexpectedValueException;

final class JsonShapeTest extends TestCase
{
    public function test_it_reads_each_shape_it_checks(): void
    {
        self::assertSame(['a' => 1, '2' => 'b'], JsonShape::map(['a' => 1, 2 => 'b'], 'x'));
        self::assertSame([], JsonShape::map([], 'x'));
        self::assertSame([1, 'b'], JsonShape::list([1, 'b'], 'x'));
        self::assertSame('a', JsonShape::string('a', 'x'));
        self::assertSame(3, JsonShape::int(3, 'x'));
        self::assertSame([1, 2], JsonShape::ints([1, 2], 'x'));
        self::assertSame(['nl' => 'Straat', 'en' => 'Street'], JsonShape::localized(['nl' => 'Straat', 'en' => 'Street', 'de' => 'Strasse'], 'x'));
    }

    public function test_the_lenient_readers_fall_back_for_a_value_of_another_shape(): void
    {
        self::assertSame('a', JsonShape::filledString('a'));
        self::assertNull(JsonShape::filledString(''));
        self::assertNull(JsonShape::filledString(127));
        self::assertNull(JsonShape::filledString(null));

        self::assertSame('', JsonShape::optionalString(''));
        self::assertSame('MAP a 127.0.0.1', JsonShape::optionalString('MAP a 127.0.0.1'));
        self::assertNull(JsonShape::optionalString(127));
        self::assertNull(JsonShape::optionalString(['a']));

        self::assertSame(2.5, JsonShape::floatOr(2.5, 1.0));
        self::assertSame(3.0, JsonShape::floatOr('3', 1.0));
        self::assertSame(1.0, JsonShape::floatOr('wide', 1.0));
        self::assertSame(0.5, JsonShape::floatOr(null, 0.5));
    }

    /**
     * @return iterable<string, array{callable(): mixed, string}>
     */
    public static function wrongShapes(): iterable
    {
        yield 'a list where an object belongs' => [static fn (): array => JsonShape::map([1, 2], 'spaces[0]'), 'spaces[0] is not an object.'];
        yield 'an object where a list belongs' => [static fn (): array => JsonShape::list(['a' => 1], 'groups'), 'groups is not a list.'];
        yield 'a number where a string belongs' => [static fn (): string => JsonShape::string(1, 'id'), 'id is not a string.'];
        yield 'a float where a whole number belongs' => [static fn (): int => JsonShape::int(1.5, 'price'), 'price is not a whole number.'];
        yield 'a string in a list of numbers' => [static fn (): array => JsonShape::ints([1, '2'], 'rent'), 'rent[] is not a whole number.'];
        yield 'a missing language' => [static fn (): array => JsonShape::localized(['nl' => 'Straat'], 'name'), 'name.en is not a string.'];
    }

    /**
     * @param callable(): mixed $read
     */
    #[DataProvider('wrongShapes')]
    public function test_it_names_the_path_of_a_value_of_the_wrong_shape(callable $read, string $message): void
    {
        $this->expectException(UnexpectedValueException::class);
        $this->expectExceptionMessage($message);

        $read();
    }
}
