<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\ValueObjects\PrintEdition;
use Illuminate\Support\Facades\Config;

/**
 * A generated PDF belongs to a hash of the edition data, the assets, the
 * profile and the release version (B62). After a deploy with another
 * renderer a saved PDF is outdated instead of silently wrong.
 */
final class PrintCacheKey
{
    /**
     * @param array<string, string> $assetChecksums Photo ref to the checksum of its print source.
     */
    public static function make(PrintPart $part, PrintSet $set, PrintEdition $edition, array $assetChecksums): string
    {
        ksort($assetChecksums);

        $payload = self::canonical([
            'part' => $part->value,
            'set' => $set->value,
            'edition' => $edition->toCacheArray(),
            'assets' => $assetChecksums,
            'profile' => Config::array('printopoly.print.profile'),
            'release' => PrintRelease::current(),
        ]);

        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));
    }

    /**
     * Sorts the keys of every object, so the same data always hashes the same.
     *
     * @param array<mixed> $value
     * @return array<mixed>
     */
    private static function canonical(array $value): array
    {
        $sorted = [];

        foreach ($value as $key => $item) {
            $sorted[$key] = is_array($item) ? self::canonical($item) : $item;
        }

        if (! array_is_list($sorted)) {
            ksort($sorted);
        }

        return $sorted;
    }
}
