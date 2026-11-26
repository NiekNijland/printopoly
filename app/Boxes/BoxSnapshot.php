<?php

declare(strict_types=1);

namespace App\Boxes;

use App\Edition\EditionValidator;
use App\Modules\Content\Enums\Locale;

/**
 * The part of an edition a box keeps (B128): the theme, whether the cards and pawns are in the set, and the names and texts that differ from the standard
 * edition, for the spaces, cards and pawns friends can add to, and the names of renamed decks. An extra card (B135) is kept with `added`, so friends
 * can add to it too. No photos, no layers, no money, no ids. It is
 * cleaned rather than trusted: whatever the owner's browser sends outside this shape is dropped.
 */
final readonly class BoxSnapshot
{
    private const array THEMES = ['classic', 'riso', 'strak', 'gala'];

    public function __construct(private BoxTargets $targets)
    {
    }

    /**
     * @param array<mixed> $input
     * @return array{theme: string, currency: string|null, parts: array{cards: bool, pawns: bool}, elements: array<string, array{name?: string, text?: string, town?: string, added?: true}>}
     */
    public function clean(array $input): array
    {
        $theme = is_string($input['theme'] ?? null) && in_array($input['theme'], self::THEMES, true) ? $input['theme'] : 'classic';
        $currency = is_string($input['currency'] ?? null) && preg_match('/^[a-z]{2,8}$/', $input['currency']) === 1 ? $input['currency'] : null;
        $elements = [];
        $given = is_array($input['elements'] ?? null) ? $input['elements'] : [];

        foreach ($given as $key => $element) {
            $key = (string) $key;

            if (! is_array($element)) {
                continue;
            }

            // The edition's own words, so friends see the cards and spaces as they are printed: a renamed deck
            // (UX 4, ronde 3) and the words a card text holds, such as "bushalte" for {station} (B177).
            if (preg_match('/^words\.(chance|chest|station|utility|house|hotel|jail|currency)$/', $key, $match) === 1) {
                $word = [];
                $name = is_string($element['name'] ?? null) ? mb_substr(BoxTargets::tidy($element['name']), 0, EditionValidator::MAX_WORD_LENGTH) : '';
                $text = is_string($element['text'] ?? null) ? mb_substr(BoxTargets::tidy($element['text']), 0, $match[1] === 'currency' ? EditionValidator::MAX_SYMBOL_LENGTH : EditionValidator::MAX_WORD_LENGTH) : '';

                if ($name !== '') {
                    $word['name'] = $name;
                }

                // Only a word with a plural or a symbol keeps a text; a deck has a name only.
                if ($text !== '' && $match[1] !== 'chance' && $match[1] !== 'chest') {
                    $word['text'] = $text;
                }

                if ($word !== []) {
                    $elements[$key] = $word;
                }

                continue;
            }

            $extra = $this->targets->isExtraCard($key);

            // Every space keeps its name, so the board on the friends' page looks like the edition, also where
            // friends cannot add anything (B175).
            if (! $this->targets->allows($key) && ! $this->targets->isSpace($key) && (! $extra || ($element['added'] ?? false) !== true)) {
                continue;
            }

            $field = $this->targets->field($key);
            $value = $element[$field] ?? null;
            $kept = $extra ? ['added' => true] : [];

            if (is_string($value)) {
                $value = mb_substr(BoxTargets::tidy($value), 0, $this->targets->maxLength($key));

                if ($value !== '') {
                    $kept[$field] = $value;
                }
            }

            if ($kept !== []) {
                $elements[$key] = $kept;
            }
        }

        $parts = is_array($input['parts'] ?? null) ? $input['parts'] : [];

        return [
            'theme' => $theme,
            'currency' => $currency,
            'parts' => ['cards' => ($parts['cards'] ?? true) !== false, 'pawns' => ($parts['pawns'] ?? false) === true],
            'elements' => $elements,
        ];
    }

    public static function language(mixed $value): string
    {
        return (Locale::tryFrom(is_string($value) ? $value : '') ?? Locale::default())->value;
    }
}
