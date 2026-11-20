<?php

declare(strict_types=1);

namespace App\Boxes;

use App\Enums\Locale;

/**
 * The part of an edition a box keeps (B128): the theme, whether the cards and pawns are in the set, and the names and texts that differ from the standard
 * edition, for the spaces, cards and pawns friends can add to. No photos, no layers, no money, no ids. It is
 * cleaned rather than trusted: whatever the owner's browser sends outside this shape is dropped.
 */
final readonly class BoxSnapshot
{
    private const array THEMES = ['classic', 'riso', 'strak'];

    public function __construct(private BoxTargets $targets)
    {
    }

    /**
     * @param array<mixed> $input
     * @return array{theme: string, currency: string|null, parts: array{cards: bool, pawns: bool}, elements: array<string, array{name?: string, text?: string, town?: string}>}
     */
    public function clean(array $input): array
    {
        $theme = is_string($input['theme'] ?? null) && in_array($input['theme'], self::THEMES, true) ? $input['theme'] : 'classic';
        $currency = is_string($input['currency'] ?? null) && preg_match('/^[a-z]{2,8}$/', $input['currency']) === 1 ? $input['currency'] : null;
        $elements = [];
        $given = is_array($input['elements'] ?? null) ? $input['elements'] : [];

        foreach ($given as $key => $element) {
            $key = (string) $key;

            if (! is_array($element) || ! $this->targets->allows($key)) {
                continue;
            }

            $field = $this->targets->field($key);
            $value = $element[$field] ?? null;

            if (is_string($value)) {
                $value = mb_substr(BoxTargets::tidy($value), 0, $this->targets->maxLength($key));

                if ($value !== '') {
                    $elements[$key] = [$field => $value];
                }
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
