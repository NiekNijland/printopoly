<?php

declare(strict_types=1);

namespace Tests\Support;

use InvalidArgumentException;

final class UniqueValue
{
    private static int $issued = 0;

    /**
     * @return non-empty-string letters and digits of the given length, never the same twice in one test process
     */
    public static function token(int $length): string
    {
        throw_if($length < 8, InvalidArgumentException::class, 'A unique token needs at least 8 characters.');
        self::$issued++;

        return 'u' . mb_str_pad((string) self::$issued, $length - 1, '0', STR_PAD_LEFT);
    }
}
