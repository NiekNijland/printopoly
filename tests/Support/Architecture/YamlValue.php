<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * Reads a parsed YAML or JSON document without trusting its shape: a missing key, or a key of another type than asked, reads as
 * the empty value of the asked type. The CI guards read files a pull request can change, so a malformed file must give a finding,
 * not a type error.
 */
final class YamlValue
{
    public static function at(mixed $value, string|int ...$path): mixed
    {
        foreach ($path as $key) {
            if (! is_array($value) || ! array_key_exists($key, $value)) {
                return null;
            }

            $value = $value[$key];
        }

        return $value;
    }

    /**
     * @return array<array-key, mixed>
     */
    public static function map(mixed $value, string|int ...$path): array
    {
        $found = self::at($value, ...$path);

        return is_array($found) ? $found : [];
    }

    public static function string(mixed $value, string|int ...$path): string
    {
        $found = self::at($value, ...$path);

        return is_string($found) ? $found : '';
    }

    /**
     * @return list<string> the string members of a list, or the one string a scalar key holds
     */
    public static function strings(mixed $value, string|int ...$path): array
    {
        $found = self::at($value, ...$path);

        if (is_string($found)) {
            return [$found];
        }

        return array_values(array_filter(is_array($found) ? $found : [], is_string(...)));
    }
}
