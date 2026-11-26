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
