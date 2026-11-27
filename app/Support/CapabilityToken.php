<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

final class CapabilityToken
{
    public const int LENGTH = 40;

    public static function make(): string
    {
        return Str::random(self::LENGTH);
    }

    public static function pattern(): string
    {
        return '/^[A-Za-z0-9]{' . self::LENGTH . '}$/';
    }
}
