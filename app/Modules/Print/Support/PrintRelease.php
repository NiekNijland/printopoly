<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;

/**
 * The release part of the PDF cache key (B62). It is `PRINTOPOLY_RELEASE` when that is set. When it is
 * empty, which is the production default because the .env does not change between deploys, it is a hash of
 * `public/build/manifest.json`: every deploy with new frontend code gets a new key, so no saved PDF
 * survives a change of the renderer.
 */
final class PrintRelease
{
    public static function current(): string
    {
        $configured = Config::array('printopoly.print')['release'] ?? null;

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        $manifest = public_path('build/manifest.json');

        if (! is_file($manifest)) {
            return 'dev';
        }

        // Hashing a few hundred kilobytes on every status poll would be wasteful: cache it per file version.
        $stamp = (int) filemtime($manifest) . '-' . (int) filesize($manifest);

        return Cache::remember('print-release:' . $stamp, 86400 * 30, static fn (): string => substr((string) hash_file('sha256', $manifest), 0, 16));
    }
}
