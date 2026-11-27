<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use App\Modules\Editions\Enums\ElementKind;

/**
 * @phpstan-import-type Override from EditionValidator
 */
final readonly class ElementsParser
{
    public function __construct(private StandardEdition $standard, private ElementOverrideParser $overrides)
    {
    }

    /**
     * @param list<string> $errors
     * @return array<string, Override>|null
     */
    public function all(mixed $value, array &$errors): ?array
    {
        $value = ElementMigration::migrate($value);

        if (! $this->fits($value, $errors)) {
            return null;
        }

        $before = count($errors);
        $elements = [];

        foreach ($value as $key => $override) {
            $parsed = $this->overrides->parse((string) $key, $override, $errors);

            if ($parsed !== null) {
                $elements[(string) $key] = $parsed;
            }
        }

        return count($errors) === $before ? $elements : null;
    }

    /**
     * @param list<string> $errors
     * @return array<string, Override|null>|null
     */
    public function changes(mixed $value, array &$errors): ?array
    {
        $value = ElementMigration::migrate($value);

        if (! $this->fits($value, $errors)) {
            return null;
        }

        $before = count($errors);
        $changes = [];

        foreach ($value as $key => $override) {
            $key = (string) $key;

            if ($override === null) {
                if (ElementKind::fromKey($key, $this->standard) instanceof ElementKind) {
                    $changes[$key] = null;
                } else {
                    $errors[] = "elements.{$key}: unknown element key";
                }

                continue;
            }

            $parsed = $this->overrides->parse($key, $override, $errors);

            if ($parsed !== null) {
                $changes[$key] = $parsed;
            }
        }

        return count($errors) === $before ? $changes : null;
    }

    /**
     * @param list<string> $errors
     *
     * @phpstan-assert-if-true array<array-key, mixed> $value
     */
    private function fits(mixed $value, array &$errors): bool
    {
        if (! JsonValue::isObject($value)) {
            $errors[] = 'elements: must be an object';

            return false;
        }

        if (count($value) > EditionValidator::MAX_ELEMENTS) {
            $errors[] = 'elements: too many elements';

            return false;
        }

        return true;
    }
}
