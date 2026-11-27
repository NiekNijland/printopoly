<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Modules\Editions\Enums\ElementKind;

/**
 * @phpstan-import-type Card from StandardEdition
 */
final readonly class CardFieldParser
{
    public function __construct(private StandardEdition $standard)
    {
    }

    /**
     * @param list<string> $errors
     */
    public function amount(string $key, mixed $value, string $at, array &$errors): int|float|null
    {
        $card = $this->standardCard($key);

        if (! JsonValue::isNumber($value)) {
            $errors[] = "{$at}: must be a number";
        } elseif (ElementKind::isExtraCard($key, $this->standard)) {
            if (Amounts::extraCardAmountAllowed($value)) {
                return $value;
            }

            $max = Amounts::MAX_EXTRA_CARD_AMOUNT;
            $errors[] = "{$at}: must be a whole amount from -{$max} to {$max}, not 0";
        } elseif ($card === null || ($card['amount'] ?? 0) === 0) {
            $errors[] = "{$at}: this card has no amount";
        } elseif (! Amounts::cardAmountAllowed($card, $value)) {
            $range = Amounts::range($card['amount']);
            $errors[] = "{$at}: must be between {$range['min']} and {$range['max']}, in the direction of the standard amount";
        } else {
            return $value;
        }

        return null;
    }

    /**
     * @param list<string> $errors
     */
    public function added(string $key, mixed $value, string $at, array &$errors): ?true
    {
        if (! ElementKind::isExtraCard($key, $this->standard)) {
            $errors[] = "{$at}: only an extra card is added";
        } elseif ($value !== true) {
            $errors[] = "{$at}: must be true";
        } else {
            return true;
        }

        return null;
    }

    /**
     * @return Card|null
     */
    private function standardCard(string $key): ?array
    {
        [, $deck, $index] = array_pad(explode('.', $key), 3, null);

        if (($deck !== 'chance' && $deck !== 'chest') || $index === null) {
            return null;
        }

        return $this->standard->deck($deck)[(int) $index - 1] ?? null;
    }
}
