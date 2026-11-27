<?php

declare(strict_types=1);

namespace App\Support;

use UnexpectedValueException;

final class JsonShape
{
    /**
     * @return array<string, mixed>
     */
    public static function map(mixed $value, string $path): array
    {
        throw_if(! is_array($value) || ($value !== [] && array_is_list($value)), UnexpectedValueException::class, "{$path} is not an object.");

        $map = [];

        foreach ($value as $key => $item) {
            $map[(string) $key] = $item;
        }

        return $map;
    }

    /**
     * @return list<mixed>
     */
    public static function list(mixed $value, string $path): array
    {
        throw_if(! is_array($value) || ! array_is_list($value), UnexpectedValueException::class, "{$path} is not a list.");

        return $value;
    }

    public static function string(mixed $value, string $path): string
    {
        return is_string($value) ? $value : throw new UnexpectedValueException("{$path} is not a string.");
    }

    /**
     * A string that is not empty, or null for anything else: an optional text from a document or the config.
     */
    public static function filledString(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * A string, or null for anything else: an optional text that may be empty.
     */
    public static function optionalString(mixed $value): ?string
    {
        return is_string($value) ? $value : null;
    }

    /**
     * A number (or a numeric string) as a float, or the default for anything else.
     */
    public static function floatOr(mixed $value, float $default): float
    {
        return is_numeric($value) ? (float) $value : $default;
    }

    public static function int(mixed $value, string $path): int
    {
        return is_int($value) ? $value : throw new UnexpectedValueException("{$path} is not a whole number.");
    }

    /**
     * @return list<int>
     */
    public static function ints(mixed $value, string $path): array
    {
        return array_map(static fn (mixed $item): int => self::int($item, $path . '[]'), self::list($value, $path));
    }

    /**
     * @return array{nl: string, en: string}
     */
    public static function localized(mixed $value, string $path): array
    {
        $map = self::map($value, $path);

        return ['nl' => self::string($map['nl'] ?? null, $path . '.nl'), 'en' => self::string($map['en'] ?? null, $path . '.en')];
    }
}
