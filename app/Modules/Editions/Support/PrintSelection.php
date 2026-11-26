<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

/**
 * What goes in the print set of an edition (B198, B199): the set chosen last on the print page and the parts in
 * it. The print page is the only place that chooses; the editor reads it to show parts that are not in the set.
 * Stored on the edition as `printSelection: {set: 'home'|'printer', parts: string[]}`, the same as
 * `PrintSelection` in resources/js/lib/render/edition-types.ts. The board is always in the set.
 *
 * An unknown set or a value of the wrong shape is dropped, and so is a part this version does not print (the dice
 * and the houses and hotels of B200), so an older edition always opens.
 *
 * @phpstan-type Selection array{set: 'home'|'printer', parts: list<string>}
 */
final class PrintSelection
{
    /** The edition parts that can be in a set, in this order; the same as PRINT_SELECTION_PART_IDS in types.ts. */
    public const array PARTS = ['board', 'deeds', 'cards', 'houseRules', 'money', 'pawns', 'boxLid', 'invitation', 'rulesBooklet'];

    /**
     * @return Selection|null
     */
    public static function parse(mixed $value): ?array
    {
        if (! is_array($value) || ! in_array($value['set'] ?? null, ['home', 'printer'], true) || ! is_array($value['parts'] ?? null)) {
            return null;
        }

        $parts = ['board'];

        foreach ($value['parts'] as $part) {
            if (is_string($part) && in_array($part, self::PARTS, true) && ! in_array($part, $parts, true)) {
                $parts[] = $part;
            }
        }

        // The order of PARTS, whatever order came in.
        $parts = array_values(array_filter(self::PARTS, static fn (string $part): bool => in_array($part, $parts, true)));

        return ['set' => $value['set'] === 'home' ? 'home' : 'printer', 'parts' => $parts];
    }
}
