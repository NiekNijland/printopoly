<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

final class JsonValue
{
    public static function isString(mixed $value, int $max): bool
    {
        return is_string($value) && mb_strlen($value) <= $max;
    }

    /**
     * @phpstan-assert-if-true int|float $value
     */
    public static function isNumber(mixed $value): bool
    {
        return is_int($value) || (is_float($value) && is_finite($value));
    }

    /**
     * A decoded JSON object is an array that is not a list. An empty array
     * counts, because `{}` and `[]` decode the same.
     *
     * @phpstan-assert-if-true array<array-key, mixed> $value
     */
    public static function isObject(mixed $value): bool
    {
        return is_array($value) && ($value === [] || ! array_is_list($value));
    }
}
