<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Modules\Editions\Enums\ElementKind;

final readonly class ElementRepairer
{
    public function __construct(private StandardEdition $standard, private ElementOverrideParser $overrides)
    {
    }

    /**
     * The elements of a stored edition, repaired where they break a rule, so the edition always opens (round 4,
     * bug 1). The same as readStoredEdition in resources/js/features/edition/repair.ts: an own amount outside its range
     * is pulled to the nearest limit, a field that breaks a rule is dropped and an element that cannot be read at
     * all goes. A valid element is kept as stored. What was changed is added to `$repaired`.
     *
     * @param array<array-key, mixed> $elements
     * @param list<string> $repaired
     * @return array<string, mixed>
     */
    public function repair(array $elements, array &$repaired): array
    {
        $out = [];

        foreach ($elements as $key => $override) {
            $key = (string) $key;
            $errors = [];

            if ($this->overrides->parse($key, $override, $errors) !== null) {
                $out[$key] = $override;

                continue;
            }

            $kept = JsonValue::isObject($override) && ElementKind::fromKey($key, $this->standard) instanceof ElementKind
                ? $this->repairOverride($key, $override, $repaired)
                : null;

            if ($kept === null) {
                $repaired[] = "elements.{$key}: dropped";
            } else {
                $out[$key] = $kept;
            }
        }

        return $out;
    }

    /**
     * The fields of one element that pass on their own; own amounts are pulled into their range first.
     *
     * @param array<array-key, mixed> $override
     * @param list<string> $repaired
     * @return array<string, mixed>|null
     */
    private function repairOverride(string $key, array $override, array &$repaired): ?array
    {
        $extra = ElementKind::isExtraCard($key, $this->standard);

        if ($extra && ($override['added'] ?? null) !== true) {
            return null;
        }

        $kept = [];

        foreach ($override as $field => $raw) {
            $field = (string) $field;

            if ($raw === null || $field === 'layout') {
                continue;
            }

            $value = $field === 'amounts' ? $this->clampAmounts($key, $raw) : $raw;
            $single = $extra ? ['added' => true, $field => $value] : [$field => $value];
            $errors = [];
            $parsed = $this->overrides->parse($key, $single, $errors);

            if ($parsed !== null && array_key_exists($field, $parsed)) {
                $kept[$field] = $value;

                if ($value !== $raw) {
                    $repaired[] = "elements.{$key}.{$field}: pulled into range";
                }
            } else {
                $repaired[] = "elements.{$key}.{$field}: dropped";
            }
        }

        $errors = [];

        return $kept === [] || $this->overrides->parse($key, $kept, $errors) === null ? null : $kept;
    }

    /**
     * Own amounts of a space with every known amount a whole number within its range; unknown ids are dropped.
     */
    private function clampAmounts(string $key, mixed $value): mixed
    {
        if (! JsonValue::isObject($value) || ! str_starts_with($key, 'space.')) {
            return $value;
        }

        $fields = Amounts::fields($this->standard->spaceAt((int) mb_substr($key, 6)));
        $out = [];

        foreach ($value as $id => $amount) {
            $id = (string) $id;

            if (array_key_exists($id, $fields) && (is_int($amount) || (is_float($amount) && is_finite($amount)))) {
                $range = Amounts::range($fields[$id]);
                $out[$id] = max($range['min'], min($range['max'], (int) round($amount)));
            }
        }

        return $out;
    }
}
