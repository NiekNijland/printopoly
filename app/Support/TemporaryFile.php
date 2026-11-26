<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

/**
 * A new empty file in the temporary folder, readable by this user only, under a name nobody can guess; null if none.
 */
final class TemporaryFile
{
    public static function create(string $prefix): ?string
    {
        $path = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $prefix . Str::random(24);

        if (! is_dir(dirname($path)) || ! is_writable(dirname($path))) {
            return null;
        }

        $handle = fopen($path, 'x');

        if ($handle === false) {
            return null;
        }

        fclose($handle);
        chmod($path, 0600);

        return $path;
    }
}
