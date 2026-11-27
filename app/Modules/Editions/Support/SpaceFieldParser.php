<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Modules\Editions\Enums\ElementKind;

final readonly class SpaceFieldParser
{
    /** Positions of the four corners of the board. */
    private const array CORNER_POSITIONS = [0, 10, 20, 30];

    public function __construct(private StandardEdition $standard, private PhotoParser $photos)
    {
    }

    public function isCorner(string $key): bool
    {
        return in_array($this->position($key), self::CORNER_POSITIONS, true);
    }

    /**
     * The amounts of a space (B132): known ids, whole numbers, within 20% of the standard amount.
     *
     * @param list<string> $errors
     * @return array<string, int>|null
     */
    public function amounts(string $key, mixed $value, string $at, array &$errors): ?array
    {
        if (! JsonValue::isObject($value)) {
            $errors[] = "{$at}: must be an object";

            return null;
        }

        $fields = Amounts::fields($this->standard->spaceAt($this->position($key)));
        $before = count($errors);
        $out = [];

        foreach ($value as $id => $amount) {
            $id = (string) $id;

            if (! array_key_exists($id, $fields)) {
                $errors[] = "{$at}.{$id}: not an amount of this space";
            } elseif (! is_int($amount) && (! is_float($amount) || floor($amount) !== $amount)) {
                $errors[] = "{$at}.{$id}: must be a whole number";
            } else {
                $range = Amounts::range($fields[$id]);

                if ($amount < $range['min'] || $amount > $range['max']) {
                    $errors[] = "{$at}.{$id}: must be between {$range['min']} and {$range['max']}";
                } else {
                    $out[$id] = (int) $amount;
                }
            }
        }

        return count($errors) === $before ? $out : null;
    }

    /**
     * @param list<string> $errors
     */
    public function deedPhoto(string $key, mixed $value, string $at, array &$errors): ?bool
    {
        $type = $this->standard->spaces()[$this->position($key)]['type'] ?? null;

        if (! in_array($type, ['street', 'station', 'utility'], true)) {
            $errors[] = "{$at}: only a street, station or utility has a deed";
        } elseif (! is_bool($value)) {
            $errors[] = "{$at}: must be a boolean";
        } else {
            return $value;
        }

        return null;
    }

    /**
     * The image of a special space (B136): `{preset}` from our own icon set or the lucide set (B196), or `{photo, aspect}` for an
     * uploaded image. Streets have no icon.
     *
     * @param list<string> $errors
     * @return array<string, mixed>|null
     */
    public function icon(string $key, mixed $value, string $at, array &$errors): ?array
    {
        $space = $this->standard->spaces()[$this->position($key)] ?? null;

        if ($space === null || $space['type'] === 'street') {
            $errors[] = "{$at}: only a special space has an icon";

            return null;
        }

        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            $errors[] = "{$at}: must be an object";

            return null;
        }

        if (array_key_exists('preset', $value)) {
            if (count($value) === 1 && is_string($value['preset']) && ElementKind::isSpaceIconPreset($value['preset'])) {
                return ['preset' => $value['preset']];
            }

            $errors[] = "{$at}: preset must be one of the built-in icons";

            return null;
        }

        $aspect = $value['aspect'] ?? null;

        if (! JsonValue::isNumber($aspect) || $aspect < EditionValidator::MIN_ASPECT || $aspect > EditionValidator::MAX_ASPECT) {
            $errors[] = "{$at}: aspect must be a number between " . EditionValidator::MIN_ASPECT . ' and ' . EditionValidator::MAX_ASPECT;

            return null;
        }

        $photo = $this->photos->parse($value['photo'] ?? null, "{$at}.photo", $errors);

        return $photo === null ? null : ['photo' => $photo, 'aspect' => $aspect];
    }

    private function position(string $key): int
    {
        return (int) mb_substr($key, 6);
    }
}
