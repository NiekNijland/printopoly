<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Modules\Editions\Enums\ElementKind;

final class ElementMigration
{
    /**
     * Moves what an older edition or an older browser sends under a key that has since moved (`bank` became
     * `words.bank`, B148). The moved key wins when both are there. Elements that are gone (the dice and the houses
     * and hotels, B200) are dropped. The same as migrateElements in schema.ts.
     */
    public static function migrate(mixed $value): mixed
    {
        return is_array($value) ? self::keys($value) : $value;
    }

    /**
     * @template T
     *
     * @param array<array-key, T> $elements
     * @return array<array-key, T>
     */
    public static function keys(array $elements): array
    {
        foreach (ElementKind::REMOVED_KEYS as $removed) {
            unset($elements[$removed]);
        }

        foreach (ElementKind::LEGACY_KEYS as $old => $moved) {
            if (! array_key_exists($old, $elements)) {
                continue;
            }

            if (! array_key_exists($moved, $elements)) {
                $elements[$moved] = $elements[$old];
            }

            unset($elements[$old]);
        }

        return $elements;
    }
}
