<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

/**
 * Amounts you may change (B132): every amount of the game moves at most 20% up or down from the standard
 * amount, in whole amounts. The same rules as resources/js/lib/render/edition-amounts.ts.
 *
 * @phpstan-import-type Space from StandardEdition
 * @phpstan-import-type Card from StandardEdition
 */
final class Amounts
{
    public const int TOLERANCE_PERCENT = 20;

    /** The largest amount on an extra card (B135), which has no standard amount. The same as MAX_EXTRA_CARD_AMOUNT in amounts.ts. */
    public const int MAX_EXTRA_CARD_AMOUNT = 500;

    /**
     * Whole amounts between 80% and 120% of the standard amount: 60 gives 48 to 72.
     *
     * @return array{min: int, max: int}
     */
    public static function range(int $standard): array
    {
        $base = abs($standard);

        return [
            'min' => (int) round($base * (100 - self::TOLERANCE_PERCENT) / 100),
            'max' => (int) round($base * (100 + self::TOLERANCE_PERCENT) / 100),
        ];
    }

    /**
     * The adjustable amounts of a space: field id and standard value.
     *
     * @param Space $space
     * @return array<string, int>
     */
    public static function fields(array $space): array
    {
        $fields = [];

        switch ($space['type']) {
            case 'street':
            case 'station':
                $fields['price'] = $space['price'];

                foreach ($space['rent'] as $index => $rent) {
                    $fields["rent.{$index}"] = $rent;
                }

                if ($space['type'] === 'street') {
                    $fields['houseCost'] = $space['houseCost'];
                }

                $fields['mortgage'] = $space['mortgage'];

                break;
            case 'utility':
                $fields['price'] = $space['price'];
                $fields['mortgage'] = $space['mortgage'];

                break;
            case 'tax':
                $fields['amount'] = $space['amount'];

                break;
            case 'corner':
                if ($space['corner'] === 'start' && isset($space['salary'])) {
                    $fields['salary'] = $space['salary'];
                }

                break;
            default:
                break;
        }

        return $fields;
    }

    /**
     * Whether a signed card amount is allowed: a whole number within the range, paid or received (R5-11: the owner
     * chooses the direction), or zero for a card whose amount line is switched off.
     *
     * @param Card $card
     */
    public static function cardAmountAllowed(array $card, int|float $value): bool
    {
        $standard = $card['amount'] ?? 0;

        if ($standard === 0 || (! is_int($value) && floor($value) !== $value)) {
            return false;
        }

        if ($value === 0 || $value === 0.0) {
            return true;
        }

        $range = self::range($standard);

        return abs($value) >= $range['min'] && abs($value) <= $range['max'];
    }

    /**
     * Whether a signed amount is allowed on an extra card (B135): a whole amount from 1 to 500, paid or received.
     */
    public static function extraCardAmountAllowed(int|float $value): bool
    {
        if (! is_int($value) && floor($value) !== $value) {
            return false;
        }

        return $value !== 0 && $value !== 0.0 && abs($value) <= self::MAX_EXTRA_CARD_AMOUNT;
    }
}
