<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\MoneyAmount;

/**
 * @phpstan-import-type Parts from EditionValidator
 * @phpstan-import-type Settings from EditionValidator
 */
final readonly class EditionSettingsParser
{
    private const array THEMES = ['classic', 'riso', 'strak', 'gala'];

    private const array PARTS = ['board', 'deeds', 'cards', 'money', 'pawns', 'boxLid', 'houseRules', 'rulesBooklet', 'invitation'];

    /** Parts that came after the first stored editions (B123): an edition without them has them off. */
    private const array EXTRA_PARTS = ['rulesBooklet', 'invitation'];

    public function __construct(private StandardEdition $standard, private BoardProfileParser $profiles)
    {
    }

    /**
     * Only the settings of an edition, each one optional, for a patch that
     * changes no elements.
     *
     * @param array<array-key, mixed> $input
     * @param list<string> $errors
     * @return Settings
     */
    public function parse(array $input, array &$errors): array
    {
        $out = [];

        if (array_key_exists('name', $input)) {
            if (is_string($input['name']) && JsonValue::isString($input['name'], EditionValidator::MAX_NAME_LENGTH)) {
                $out['name'] = $input['name'];
            } else {
                $errors[] = 'name: must be a string of at most ' . EditionValidator::MAX_NAME_LENGTH . ' characters';
            }
        }

        if (array_key_exists('language', $input)) {
            if (is_string($input['language']) && in_array($input['language'], Locale::values(), true)) {
                $out['language'] = $input['language'];
            } else {
                $errors[] = 'language: must be "nl" or "en"';
            }
        }

        if (array_key_exists('currency', $input)) {
            if (is_string($input['currency']) && $this->isCurrency($input['currency'])) {
                $out['currency'] = $input['currency'];
            } else {
                $errors[] = 'currency: unknown currency';
            }
        }

        if (array_key_exists('theme', $input)) {
            if (is_string($input['theme']) && in_array($input['theme'], self::THEMES, true)) {
                $out['theme'] = $input['theme'];
            } else {
                $errors[] = 'theme: unknown theme';
            }
        }

        if (array_key_exists('boardProfile', $input)) {
            $profile = $this->profiles->parse($input['boardProfile'], $errors);

            if ($profile !== null) {
                $out['boardProfile'] = $profile;
            }
        }

        if (array_key_exists('parts', $input)) {
            $parts = $this->parts($input['parts'], $errors);

            if ($parts !== null) {
                $out['parts'] = $parts;
            }
        }

        // How much play money to print (B156); null goes back to the default of each set.
        if (array_key_exists('moneyAmount', $input)) {
            $amount = $input['moneyAmount'];

            if ($amount === null || (is_string($amount) && MoneyAmount::tryFrom($amount) instanceof MoneyAmount)) {
                $out['moneyAmount'] = $amount;
            } else {
                $errors[] = 'moneyAmount: must be "four", "eight", "full" or null';
            }
        }

        // What goes in the print set (B198); null forgets it. A value of the wrong shape is dropped, not refused.
        if (array_key_exists('printSelection', $input)) {
            $selection = PrintSelection::parse($input['printSelection']);

            if ($selection !== null || $input['printSelection'] === null) {
                $out['printSelection'] = $selection;
            }
        }

        return $out;
    }

    /**
     * @param list<string> $errors
     * @return Parts|null
     */
    private function parts(mixed $value, array &$errors): ?array
    {
        if (! JsonValue::isObject($value)) {
            $errors[] = 'parts: must be an object';

            return null;
        }

        $before = count($errors);
        $parts = [];

        foreach (self::PARTS as $id) {
            $flag = $value[$id] ?? (in_array($id, self::EXTRA_PARTS, true) ? false : null);

            if (! is_bool($flag)) {
                $errors[] = "parts.{$id}: must be a boolean";

                continue;
            }

            $parts[$id] = $flag;
        }

        if (($parts['board'] ?? true) === false) {
            $errors[] = 'parts.board: the board is always on';
        }

        return count($errors) === $before ? $parts : null;
    }

    private function isCurrency(string $id): bool
    {
        return array_any($this->standard->currencies(), fn (array $currency): bool => $currency['id'] === $id);
    }
}
