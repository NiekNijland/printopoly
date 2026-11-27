<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Modules\Editions\Enums\ElementKind;

/**
 * @phpstan-import-type Override from EditionValidator
 */
final readonly class ElementOverrideParser
{
    public function __construct(
        private StandardEdition $standard,
        private SpaceFieldParser $spaces,
        private CardFieldParser $cards,
        private ElementFieldParser $fields,
    ) {
    }

    /**
     * @param list<string> $errors
     * @return Override|null
     */
    public function parse(string $key, mixed $value, array &$errors): ?array
    {
        $kind = ElementKind::fromKey($key, $this->standard);

        if (! $kind instanceof ElementKind) {
            $errors[] = "elements.{$key}: unknown element key";

            return null;
        }

        if (! JsonValue::isObject($value)) {
            $errors[] = "elements.{$key}: override must be an object";

            return null;
        }

        $out = [];
        $before = count($errors);

        foreach ($value as $field => $fieldValue) {
            $field = (string) $field;

            // Older editions still carry a layout; it is accepted and ignored (B122).
            if ($fieldValue === null || $field === 'layout') {
                continue;
            }

            $parsed = $this->field($key, $kind, $field, $fieldValue, "elements.{$key}.{$field}", $errors);

            if ($parsed !== null) {
                $out[$field] = $parsed;
            }
        }

        if (count($errors) === $before && ElementKind::isExtraCard($key, $this->standard) && ($out['added'] ?? false) !== true) {
            $errors[] = "elements.{$key}: an extra card needs \"added\": true";
        }

        return count($errors) === $before ? $out : null;
    }

    /**
     * @param list<string> $errors
     */
    private function field(string $key, ElementKind $kind, string $field, mixed $value, string $at, array &$errors): mixed
    {
        if (! in_array($field, $kind->allowedFields(), true)) {
            $errors[] = "{$at}: field is not allowed here";

            return null;
        }

        if ($field === 'text' && $kind === ElementKind::Space && ! $this->spaces->isCorner($key)) {
            $errors[] = "{$at}: only a corner has a text";

            return null;
        }

        return match ($field) {
            'amounts' => $this->spaces->amounts($key, $value, $at, $errors),
            'deedPhoto' => $this->spaces->deedPhoto($key, $value, $at, $errors),
            'icon' => $this->spaces->icon($key, $value, $at, $errors),
            'amount' => $this->cards->amount($key, $value, $at, $errors),
            'added' => $this->cards->added($key, $value, $at, $errors),
            'style' => $this->style($key, $value, $at, $errors),
            default => $this->fields->parse($field, $value, $at, $errors, $this->limits($key, $kind)),
        };
    }

    /**
     * The style of a part (B268): one of the ids of that part in part-styles.json.
     *
     * @param list<string> $errors
     */
    private function style(string $key, mixed $value, string $at, array &$errors): mixed
    {
        if (PartStyles::isStyle($key, $value)) {
            return $value;
        }

        $errors[] = "{$at}: must be one of " . implode(', ', PartStyles::idsFor(PartStyles::partOfKey($key) ?? ''));

        return null;
    }

    /**
     * The longest `name` and `text` an element accepts.
     *
     * @return array{name: int, text: int}
     */
    private function limits(string $key, ElementKind $kind): array
    {
        return match ($kind) {
            // The bank name was its own element with the length of a name; it keeps that room (B148).
            ElementKind::Words => ['name' => $key === 'words.bank' ? EditionValidator::MAX_NAME_LENGTH : EditionValidator::MAX_WORD_LENGTH, 'text' => $key === 'words.currency' ? EditionValidator::MAX_SYMBOL_LENGTH : EditionValidator::MAX_WORD_LENGTH],
            ElementKind::Space => ['name' => EditionValidator::MAX_NAME_LENGTH, 'text' => EditionValidator::MAX_CORNER_TEXT_LENGTH],
            ElementKind::Deed => ['name' => EditionValidator::MAX_NAME_LENGTH, 'text' => EditionValidator::MAX_STORY_LENGTH],
            default => ['name' => EditionValidator::MAX_NAME_LENGTH, 'text' => EditionValidator::MAX_TEXT_LENGTH],
        };
    }
}
