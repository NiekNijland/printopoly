<?php

declare(strict_types=1);

namespace App\Edition;

use App\Enums\Locale;
use App\Enums\MoneyAmount;
use App\Game\StandardEdition;
use Illuminate\Validation\ValidationException;

/**
 * Server-side twin of resources/js/lib/edition/schema.ts: the same rules for
 * an edition, a board profile and one element override. Whatever the browser
 * accepts, the server accepts, and the other way around. Unknown fields are
 * dropped and unknown element keys are errors.
 *
 * Messages name the path, such as `elements.space.01.name`.
 *
 * @phpstan-import-type Card from StandardEdition
 *
 * @phpstan-type Photo array{photoId: string, cx: int|float, cy: int|float, scale: int|float, rotation: int|float, grayscale: bool, fit?: true}
 * @phpstan-type Override array<string, mixed>
 * @phpstan-type Profile array{id: string, name: string, outer: int|float, corner: int|float, border: int|float, panels: int, boxLid: array{w: int|float, h: int|float}, provisional?: true}
 * @phpstan-type Parts array<string, bool>
 * @phpstan-type Settings array{name?: string, language?: string, currency?: string, theme?: string, boardProfile?: Profile, parts?: Parts, moneyAmount?: string|null}
 * @phpstan-type EditionInput array{schemaVersion: int, id: string, name: string, language: string, currency: string, theme: string, boardProfile: Profile, parts: Parts, elements: array<string, Override>, template?: string, moneyAmount?: string, revision: int, createdAt: int, updatedAt: int}
 * @phpstan-type PatchInput array{baseRevision: int, name?: string, language?: string, currency?: string, theme?: string, boardProfile?: Profile, parts?: Parts, moneyAmount?: string|null, elements?: array<string, Override|null>}
 */
final readonly class EditionValidator
{
    public const int SCHEMA_VERSION = 1;

    public const int MAX_NAME_LENGTH = 120;

    public const int MAX_TEXT_LENGTH = 2000;

    public const int MAX_LAYERS = 24;

    /** Width divided by height of a centre photo or logo; the same as MIN_ASPECT and MAX_ASPECT in schema.ts. */
    public const float MIN_ASPECT = 0.05;

    public const float MAX_ASPECT = 20.0;

    /** Longest house, hotel, jail, deck or currency name; the same as MAX_WORD_LENGTH in lib/edition/words.ts. */
    public const int MAX_WORD_LENGTH = 40;

    /** Longest currency symbol. */
    public const int MAX_SYMBOL_LENGTH = 6;

    /** Longest short text on a corner of the board. */
    public const int MAX_CORNER_TEXT_LENGTH = 120;

    /** Positions of the four corners of the board. */
    private const array CORNER_POSITIONS = [0, 10, 20, 30];

    /** Longest purpose on a card ("your language course"); the same as MAX_PURPOSE_LENGTH in schema.ts. */
    public const int MAX_PURPOSE_LENGTH = 60;

    /** Longest story on the back of a title deed (B169); the same as MAX_STORY_LENGTH in schema.ts. */
    public const int MAX_STORY_LENGTH = 160;

    /** Smallest title ribbon on the board centre (B170); the same as MIN_TITLE_SCALE in schema.ts. */
    public const float MIN_TITLE_SCALE = 0.5;

    /** The fonts and alignments of a text layer; the same as LAYER_FONTS and LAYER_ALIGNS in types.ts. */
    private const array LAYER_FONTS = ['heading', 'body', 'mono'];

    private const array LAYER_ALIGNS = ['left', 'center', 'right'];

    /** More than every key there is, so only abuse hits it. */
    public const int MAX_ELEMENTS = 200;

    /** Smallest space width in mm; the same as MIN_SPACE_WIDTH in lib/print/board.ts. */
    private const int MIN_SPACE_WIDTH = 15;

    private const array THEMES = ['classic', 'riso', 'strak'];

    /** The templates an edition can start from (B127, B152); the same as TEMPLATE_IDS in lib/edition/types.ts. */
    public const array TEMPLATES = ['village', 'friends', 'company', 'school', 'club', 'bachelor', 'wedding', 'birthday', 'family'];

    private const array PARTS = ['board', 'deeds', 'cards', 'money', 'pawns', 'boxLid', 'houseRules', 'rulesBooklet', 'foldModels', 'dice', 'invitation'];

    /** Parts that came after the first stored editions (B123): an edition without them has them off. */
    private const array EXTRA_PARTS = ['rulesBooklet', 'foldModels', 'dice', 'invitation'];

    public function __construct(private StandardEdition $standard)
    {
    }

    /**
     * A whole edition, as the browser holds it.
     *
     * @return EditionInput
     *
     * @throws ValidationException
     */
    public function edition(mixed $input): array
    {
        $errors = [];
        $edition = $this->tryEdition($input, $errors);

        if ($edition === null) {
            throw $this->exception($errors);
        }

        return $edition;
    }

    /**
     * Like edition(), but collects the messages instead of throwing: the import
     * validates several editions and reports per edition.
     *
     * @param list<string> $errors
     * @return EditionInput|null
     */
    public function tryEdition(mixed $input, array &$errors): ?array
    {
        $edition = $this->parseEdition($input, $errors);

        return $errors === [] ? $edition : null;
    }

    /**
     * A patch against a known revision: only the fields that changed, and
     * `null` for an element whose override is gone.
     *
     * @return PatchInput
     *
     * @throws ValidationException
     */
    public function patch(mixed $input): array
    {
        if (! is_array($input)) {
            throw $this->exception(['patch: must be an object']);
        }

        $errors = [];
        $base = $input['baseRevision'] ?? null;

        if (! is_int($base) || $base < 0) {
            $errors[] = 'baseRevision: must be a non-negative integer';
        }

        $out = $this->settings($input, $errors);

        if (array_key_exists('elements', $input)) {
            $changes = $this->parseElementChanges($input['elements'], $errors);

            if ($changes !== null) {
                $out['elements'] = $changes;
            }
        }

        if ($errors === [] && $out === []) {
            $errors[] = 'patch: nothing to change';
        }

        if ($errors !== [] || ! is_int($base)) {
            throw $this->exception($errors);
        }

        return ['baseRevision' => $base, ...$out];
    }

    /**
     * Only the settings of an edition, each one optional, for a patch that
     * changes no elements.
     *
     * @param array<array-key, mixed> $input
     * @param list<string> $errors
     * @return Settings
     */
    public function settings(array $input, array &$errors): array
    {
        $out = [];

        if (array_key_exists('name', $input)) {
            if (is_string($input['name']) && $this->isString($input['name'], self::MAX_NAME_LENGTH)) {
                $out['name'] = $input['name'];
            } else {
                $errors[] = 'name: must be a string of at most ' . self::MAX_NAME_LENGTH . ' characters';
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
            $profile = $this->parseProfile($input['boardProfile'], $errors);

            if ($profile !== null) {
                $out['boardProfile'] = $profile;
            }
        }

        if (array_key_exists('parts', $input)) {
            $parts = $this->parseParts($input['parts'], $errors);

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

        return $out;
    }

    /**
     * @param list<string> $errors
     * @return EditionInput|null
     */
    private function parseEdition(mixed $input, array &$errors): ?array
    {
        if (! is_array($input)) {
            $errors[] = 'edition: must be an object';

            return null;
        }

        if (($input['schemaVersion'] ?? null) !== self::SCHEMA_VERSION) {
            $errors[] = 'schemaVersion: expected ' . self::SCHEMA_VERSION;
        }

        $id = $input['id'] ?? null;

        if (! is_string($id) || preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id) !== 1) {
            $errors[] = 'id: must be 1 to 64 letters, digits, dashes or underscores';
        }

        foreach (['name', 'language', 'currency', 'theme', 'boardProfile', 'parts'] as $required) {
            if (! array_key_exists($required, $input)) {
                $errors[] = "{$required}: is required";
            }
        }

        $settings = $this->settings($input, $errors);

        $revision = $input['revision'] ?? null;

        if (! is_int($revision) || $revision < 0) {
            $errors[] = 'revision: must be a non-negative integer';
        }

        $createdAt = $input['createdAt'] ?? null;
        $updatedAt = $input['updatedAt'] ?? null;

        if (! $this->isNumber($createdAt)) {
            $errors[] = 'createdAt: must be a number';
        }

        if (! $this->isNumber($updatedAt)) {
            $errors[] = 'updatedAt: must be a number';
        }

        $elements = $this->parseElements(self::migrateElements($input['elements'] ?? null), $errors);

        if (
            $errors !== []
            || ! is_string($id)
            || ! is_int($revision)
            || ! $this->isNumber($createdAt)
            || ! $this->isNumber($updatedAt)
            || $elements === null
            || ! isset($settings['name'], $settings['language'], $settings['currency'], $settings['theme'], $settings['boardProfile'], $settings['parts'])
        ) {
            return null;
        }

        $edition = [
            'schemaVersion' => self::SCHEMA_VERSION,
            'id' => $id,
            'name' => $settings['name'],
            'language' => $settings['language'],
            'currency' => $settings['currency'],
            'theme' => $settings['theme'],
            'boardProfile' => $settings['boardProfile'],
            'parts' => $settings['parts'],
            'elements' => $elements,
            'revision' => $revision,
            'createdAt' => (int) $createdAt,
            'updatedAt' => (int) $updatedAt,
        ];

        // The template the edition started from (B152); like the browser, an unknown one is dropped.
        $template = $input['template'] ?? null;

        if (is_string($template) && in_array($template, self::TEMPLATES, true)) {
            $edition['template'] = $template;
        }

        if (is_string($settings['moneyAmount'] ?? null)) {
            $edition['moneyAmount'] = $settings['moneyAmount'];
        }

        return $edition;
    }

    /**
     * Moves what an older edition or an older browser sends under a key that has since moved (`bank` became
     * `words.bank`, B148). The moved key wins when both are there. The same as migrateElements in schema.ts.
     */
    public static function migrateElements(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        foreach (ElementKind::LEGACY_KEYS as $old => $moved) {
            if (! array_key_exists($old, $value)) {
                continue;
            }

            if (! array_key_exists($moved, $value)) {
                $value[$moved] = $value[$old];
            }

            unset($value[$old]);
        }

        return $value;
    }

    /**
     * @param list<string> $errors
     * @return array<string, Override>|null
     */
    private function parseElements(mixed $value, array &$errors): ?array
    {
        if (! $this->isObject($value)) {
            $errors[] = 'elements: must be an object';

            return null;
        }

        if (count($value) > self::MAX_ELEMENTS) {
            $errors[] = 'elements: too many elements';

            return null;
        }

        $before = count($errors);
        $elements = [];

        foreach ($value as $key => $override) {
            $parsed = $this->parseOverride((string) $key, $override, $errors);

            if ($parsed !== null) {
                $elements[(string) $key] = $parsed;
            }
        }

        return count($errors) === $before ? $elements : null;
    }

    /**
     * The elements of a stored edition, repaired where they break a rule, so the edition always opens (round 4,
     * bug 1). The same as readStoredEdition in resources/js/lib/edition/repair.ts: an own amount outside its range
     * is pulled to the nearest limit, a field that breaks a rule is dropped and an element that cannot be read at
     * all goes. A valid element is kept as stored. What was changed is added to `$repaired`.
     *
     * @param array<array-key, mixed> $elements
     * @param list<string> $repaired
     * @return array<string, mixed>
     */
    public function repairElements(array $elements, array &$repaired): array
    {
        $out = [];

        foreach ($elements as $key => $override) {
            $key = (string) $key;
            $errors = [];

            if ($this->parseOverride($key, $override, $errors) !== null) {
                $out[$key] = $override;

                continue;
            }

            $kept = $this->isObject($override) && ElementKind::fromKey($key, $this->standard) instanceof ElementKind
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
            $parsed = $this->parseOverride($key, $single, $errors);

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

        return $kept === [] || $this->parseOverride($key, $kept, $errors) === null ? null : $kept;
    }

    /**
     * Own amounts of a space with every known amount a whole number within its range; unknown ids are dropped.
     */
    private function clampAmounts(string $key, mixed $value): mixed
    {
        if (! $this->isObject($value) || ! str_starts_with($key, 'space.')) {
            return $value;
        }

        $fields = Amounts::fields($this->standard->spaceAt((int) substr($key, 6)));
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

    /**
     * @param list<string> $errors
     * @return array<string, Override|null>|null
     */
    private function parseElementChanges(mixed $value, array &$errors): ?array
    {
        $value = self::migrateElements($value);

        if (! $this->isObject($value)) {
            $errors[] = 'elements: must be an object';

            return null;
        }

        if (count($value) > self::MAX_ELEMENTS) {
            $errors[] = 'elements: too many elements';

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

            $parsed = $this->parseOverride($key, $override, $errors);

            if ($parsed !== null) {
                $changes[$key] = $parsed;
            }
        }

        return count($errors) === $before ? $changes : null;
    }

    /**
     * @param list<string> $errors
     * @return Override|null
     */
    private function parseOverride(string $key, mixed $value, array &$errors): ?array
    {
        $kind = ElementKind::fromKey($key, $this->standard);

        if (! $kind instanceof ElementKind) {
            $errors[] = "elements.{$key}: unknown element key";

            return null;
        }

        if (! $this->isObject($value)) {
            $errors[] = "elements.{$key}: override must be an object";

            return null;
        }

        $allowed = $kind->allowedFields();
        $out = [];
        $before = count($errors);

        foreach ($value as $field => $fieldValue) {
            if ($fieldValue === null) {
                continue;
            }

            $field = (string) $field;
            $at = "elements.{$key}.{$field}";

            // Older editions still carry a layout; it is accepted and ignored (B122).
            if ($field === 'layout') {
                continue;
            }

            if (! in_array($field, $allowed, true)) {
                $errors[] = "{$at}: field is not allowed here";

                continue;
            }

            if ($field === 'text' && $kind === ElementKind::Space && ! in_array((int) substr($key, 6), self::CORNER_POSITIONS, true)) {
                $errors[] = "{$at}: only a corner has a text";

                continue;
            }

            if ($field === 'amounts') {
                $amounts = $this->parseAmounts($key, $fieldValue, $at, $errors);

                if ($amounts !== null) {
                    $out[$field] = $amounts;
                }

                continue;
            }

            if ($field === 'amount') {
                $card = $this->standardCard($key);

                if (! $this->isNumber($fieldValue)) {
                    $errors[] = "{$at}: must be a number";
                } elseif (ElementKind::isExtraCard($key, $this->standard)) {
                    if (Amounts::extraCardAmountAllowed($fieldValue)) {
                        $out[$field] = $fieldValue;
                    } else {
                        $max = Amounts::MAX_EXTRA_CARD_AMOUNT;
                        $errors[] = "{$at}: must be a whole amount from -{$max} to {$max}, not 0";
                    }
                } elseif ($card === null || ($card['amount'] ?? 0) === 0) {
                    $errors[] = "{$at}: this card has no amount";
                } elseif (! Amounts::cardAmountAllowed($card, $fieldValue)) {
                    $range = Amounts::range($card['amount'] ?? 0);
                    $errors[] = "{$at}: must be between {$range['min']} and {$range['max']}, in the direction of the standard amount";
                } else {
                    $out[$field] = $fieldValue;
                }

                continue;
            }

            if ($field === 'added') {
                if (! ElementKind::isExtraCard($key, $this->standard)) {
                    $errors[] = "{$at}: only an extra card is added";
                } elseif ($fieldValue !== true) {
                    $errors[] = "{$at}: must be true";
                } else {
                    $out['added'] = true;
                }

                continue;
            }

            if ($field === 'deedPhoto') {
                $type = $this->standard->spaces()[(int) substr($key, 6)]['type'] ?? null;

                if (! in_array($type, ['street', 'station', 'utility'], true)) {
                    $errors[] = "{$at}: only a street, station or utility has a deed";
                } elseif (! is_bool($fieldValue)) {
                    $errors[] = "{$at}: must be a boolean";
                } else {
                    $out['deedPhoto'] = $fieldValue;
                }

                continue;
            }

            if ($field === 'icon') {
                $icon = $this->parseIcon($key, $fieldValue, $at, $errors);

                if ($icon !== null) {
                    $out['icon'] = $icon;
                }

                continue;
            }

            $parsed = $this->parseField($field, $fieldValue, $at, $errors, $this->limits($key, $kind));

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

    /**
     * The amounts of a space (B132): known ids, whole numbers, within 20% of the standard amount.
     *
     * @param list<string> $errors
     * @return array<string, int>|null
     */
    private function parseAmounts(string $key, mixed $value, string $at, array &$errors): ?array
    {
        if (! $this->isObject($value)) {
            $errors[] = "{$at}: must be an object";

            return null;
        }

        $fields = Amounts::fields($this->standard->spaceAt((int) substr($key, 6)));
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
     * The longest `name` and `text` an element accepts.
     *
     * @return array{name: int, text: int}
     */
    private function limits(string $key, ElementKind $kind): array
    {
        return match ($kind) {
            // The bank name was its own element with the length of a name; it keeps that room (B148).
            ElementKind::Words => ['name' => $key === 'words.bank' ? self::MAX_NAME_LENGTH : self::MAX_WORD_LENGTH, 'text' => $key === 'words.currency' ? self::MAX_SYMBOL_LENGTH : self::MAX_WORD_LENGTH],
            ElementKind::Space => ['name' => self::MAX_NAME_LENGTH, 'text' => self::MAX_CORNER_TEXT_LENGTH],
            ElementKind::Deed => ['name' => self::MAX_NAME_LENGTH, 'text' => self::MAX_STORY_LENGTH],
            default => ['name' => self::MAX_NAME_LENGTH, 'text' => self::MAX_TEXT_LENGTH],
        };
    }

    /**
     * @param list<string> $errors
     * @param array{name: int, text: int} $limits
     */
    private function parseField(string $field, mixed $value, string $at, array &$errors, array $limits): mixed
    {
        switch ($field) {
            case 'name':
            case 'town':
            case 'subtitle':
                if ($this->isString($value, $limits['name'])) {
                    return $value;
                }

                $errors[] = "{$at}: must be a string of at most {$limits['name']} characters";

                return null;
            case 'purpose':
                if ($this->isString($value, self::MAX_PURPOSE_LENGTH)) {
                    return $value;
                }

                $errors[] = "{$at}: must be a string of at most " . self::MAX_PURPOSE_LENGTH . ' characters';

                return null;
            case 'text':
                if ($this->isString($value, $limits['text'])) {
                    return $value;
                }

                $errors[] = "{$at}: must be a string of at most {$limits['text']} characters";

                return null;
            case 'amount':
                if ($this->isNumber($value)) {
                    return $value;
                }

                $errors[] = "{$at}: must be a number";

                return null;
            case 'color':
                if (is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1) {
                    return $value;
                }

                $errors[] = "{$at}: must be a colour like #FFFDF7";

                return null;
            case 'pattern':
                if (is_string($value) && in_array($value, ElementKind::PATTERNS, true)) {
                    return $value;
                }

                $errors[] = "{$at}: must be one of the built-in patterns";

                return null;
            case 'hidden':
            case 'photoFrame':
            case 'titleHidden':
            case 'titleBand':
                if (is_bool($value)) {
                    return $value;
                }

                $errors[] = "{$at}: must be a boolean";

                return null;
            case 'photoStyle':
                if ($value === 'framed' || $value === 'full') {
                    return $value;
                }

                $errors[] = "{$at}: must be \"framed\" or \"full\"";

                return null;
            case 'centerMode':
                if (is_string($value) && in_array($value, ['name', 'photo', 'logo'], true)) {
                    return $value;
                }

                $errors[] = "{$at}: must be \"name\", \"photo\" or \"logo\"";

                return null;
            case 'photoAspect':
                if ($this->isNumber($value) && $value >= self::MIN_ASPECT && $value <= self::MAX_ASPECT) {
                    return $value;
                }

                $errors[] = "{$at}: must be a number between " . self::MIN_ASPECT . ' and ' . self::MAX_ASPECT;

                return null;
            case 'titleOffset':
                if ($this->isNumber($value) && $value >= -1 && $value <= 1) {
                    return $value;
                }

                $errors[] = "{$at}: must be a number from -1 to 1";

                return null;
            case 'titleScale':
                if ($this->isNumber($value) && $value >= self::MIN_TITLE_SCALE && $value <= 1) {
                    return $value;
                }

                $errors[] = "{$at}: must be a number from " . self::MIN_TITLE_SCALE . ' to 1';

                return null;
            case 'photo':
            case 'background':
                return $this->parsePhoto($value, $at, $errors);
            default:
                return $this->parseLayers($value, $at, $errors);
        }
    }

    /**
     * @param list<string> $errors
     * @return Photo|null
     */
    private function parsePhoto(mixed $value, string $at, array &$errors): ?array
    {
        if (! $this->isObject($value)) {
            $errors[] = "{$at}: photo must be an object";

            return null;
        }

        $photoId = $value['photoId'] ?? null;
        $cx = $value['cx'] ?? null;
        $cy = $value['cy'] ?? null;
        $scale = $value['scale'] ?? null;
        $rotation = $value['rotation'] ?? null;
        $grayscale = $value['grayscale'] ?? null;
        $fit = $value['fit'] ?? null;
        $valid = true;

        if ($fit !== null && ! is_bool($fit)) {
            $errors[] = "{$at}: fit must be a boolean";
            $valid = false;
        }

        if (! is_string($photoId) || $photoId === '' || strlen($photoId) > 128) {
            $errors[] = "{$at}: photoId must be a non-empty string";
            $valid = false;
        }

        if (! $this->isNumber($cx) || $cx < 0 || $cx > 1 || ! $this->isNumber($cy) || $cy < 0 || $cy > 1) {
            $errors[] = "{$at}: cx and cy must be between 0 and 1";
            $valid = false;
        }

        if (! $this->isNumber($scale) || $scale <= 0) {
            $errors[] = "{$at}: scale must be greater than 0";
            $valid = false;
        }

        if (! $this->isNumber($rotation)) {
            $errors[] = "{$at}: rotation must be a number";
            $valid = false;
        }

        if (! is_bool($grayscale)) {
            $errors[] = "{$at}: grayscale must be a boolean";
            $valid = false;
        }

        if (
            ! $valid
            || ! is_string($photoId)
            || ! $this->isNumber($cx)
            || ! $this->isNumber($cy)
            || ! $this->isNumber($scale)
            || ! $this->isNumber($rotation)
            || ! is_bool($grayscale)
        ) {
            return null;
        }

        $photo = [
            'photoId' => $photoId,
            'cx' => $cx,
            'cy' => $cy,
            'scale' => $scale,
            'rotation' => $rotation,
            'grayscale' => $grayscale,
        ];

        return $fit === true ? [...$photo, 'fit' => true] : $photo;
    }

    /**
     * The image of a special space (B136): `{preset}` from our own icon set or the lucide set (B196), or `{photo, aspect}` for an
     * uploaded image. Streets have no icon.
     *
     * @param list<string> $errors
     * @return array<string, mixed>|null
     */
    private function parseIcon(string $key, mixed $value, string $at, array &$errors): ?array
    {
        $space = $this->standard->spaces()[(int) substr($key, 6)] ?? null;

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

        if (! $this->isNumber($aspect) || $aspect < self::MIN_ASPECT || $aspect > self::MAX_ASPECT) {
            $errors[] = "{$at}: aspect must be a number between " . self::MIN_ASPECT . ' and ' . self::MAX_ASPECT;

            return null;
        }

        $photo = $this->parsePhoto($value['photo'] ?? null, "{$at}.photo", $errors);

        return $photo === null ? null : ['photo' => $photo, 'aspect' => $aspect];
    }

    /**
     * @param list<string> $errors
     * @return list<array<string, mixed>>|null
     */
    private function parseLayers(mixed $value, string $at, array &$errors): ?array
    {
        if (! is_array($value) || ! array_is_list($value) || count($value) > self::MAX_LAYERS) {
            $errors[] = "{$at}: must be a list of at most " . self::MAX_LAYERS . ' layers';

            return null;
        }

        $before = count($errors);
        $layers = [];

        foreach ($value as $index => $item) {
            $layer = $this->parseLayer($item, "{$at}[{$index}]", $errors);

            if ($layer !== null) {
                $layers[] = $layer;
            }
        }

        return count($errors) === $before ? $layers : null;
    }

    /**
     * @param list<string> $errors
     * @return array<string, mixed>|null
     */
    private function parseLayer(mixed $value, string $at, array &$errors): ?array
    {
        if (! $this->isObject($value)) {
            $errors[] = "{$at}: layer must be an object";

            return null;
        }

        $id = $value['id'] ?? null;

        if (! is_string($id) || $id === '' || strlen($id) > 128) {
            $errors[] = "{$at}: id must be a non-empty string";

            return null;
        }

        $x = $value['x'] ?? null;
        $y = $value['y'] ?? null;
        $w = $value['w'] ?? null;
        $h = $value['h'] ?? null;

        if (! $this->isNumber($x) || ! $this->isNumber($y) || ! $this->isNumber($w) || ! $this->isNumber($h)) {
            $errors[] = "{$at}: x, y, w and h must be numbers";

            return null;
        }

        $box = ['id' => $id, 'x' => $x, 'y' => $y, 'w' => $w, 'h' => $h];
        $rotation = $value['rotation'] ?? null;

        if ($rotation !== null) {
            if (! $this->isNumber($rotation)) {
                $errors[] = "{$at}: rotation must be a number";

                return null;
            }

            $box['rotation'] = $rotation;
        }
        $kind = $value['kind'] ?? null;

        if ($kind === 'text') {
            $text = $value['text'] ?? null;

            if (! $this->isString($text, self::MAX_TEXT_LENGTH)) {
                $errors[] = "{$at}: text must be a string of at most " . self::MAX_TEXT_LENGTH . ' characters';

                return null;
            }

            $layer = [...$box, 'kind' => 'text', 'text' => $text];
            $color = $value['color'] ?? null;
            $font = $value['font'] ?? null;
            $align = $value['align'] ?? null;

            if (
                ($color !== null && (! is_string($color) || preg_match('/^#[0-9a-fA-F]{6}$/', $color) !== 1))
                || ($font !== null && ! in_array($font, self::LAYER_FONTS, true))
                || ($align !== null && ! in_array($align, self::LAYER_ALIGNS, true))
            ) {
                $errors[] = "{$at}: color must be like #FFFDF7, font heading, body or mono, align left, center or right";

                return null;
            }

            if ($color !== null) {
                $layer['color'] = $color;
            }

            if ($font !== null) {
                $layer['font'] = $font;
            }

            if ($align !== null) {
                $layer['align'] = $align;
            }

            return $layer;
        }

        if ($kind === 'photo') {
            $photo = $this->parsePhoto($value['photo'] ?? null, "{$at}.photo", $errors);

            return $photo === null ? null : [...$box, 'kind' => 'photo', 'photo' => $photo];
        }

        $errors[] = "{$at}: kind must be \"text\" or \"photo\"";

        return null;
    }

    /**
     * @param list<string> $errors
     * @return Parts|null
     */
    private function parseParts(mixed $value, array &$errors): ?array
    {
        if (! $this->isObject($value)) {
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

    /**
     * @param list<string> $errors
     * @return Profile|null
     */
    private function parseProfile(mixed $value, array &$errors): ?array
    {
        if (! $this->isObject($value)) {
            $errors[] = 'boardProfile: must be an object';

            return null;
        }

        $id = $value['id'] ?? null;
        $name = $value['name'] ?? null;
        $outer = $value['outer'] ?? null;
        $corner = $value['corner'] ?? null;
        $border = $value['border'] ?? null;
        $panels = $value['panels'] ?? null;
        $boxLid = $value['boxLid'] ?? null;

        if (! is_string($id) || $id === '' || strlen($id) > 64 || ! is_string($name) || ! $this->isString($name, self::MAX_NAME_LENGTH)) {
            $errors[] = 'boardProfile: id and name must be strings';

            return null;
        }

        if (! $this->isObject($boxLid) || ! $this->isNumber($boxLid['w'] ?? null) || ! $this->isNumber($boxLid['h'] ?? null)) {
            $errors[] = 'boardProfile.boxLid: w and h must be numbers';

            return null;
        }

        if (! $this->isNumber($outer) || ! $this->isNumber($corner) || ! $this->isNumber($border) || ($panels !== 2 && $panels !== 4)) {
            $errors[] = 'boardProfile: outer, corner, border and panels (2 or 4) are required numbers';

            return null;
        }

        $problems = $this->profileProblems($outer, $corner, $border, $boxLid['w'], $boxLid['h']);

        if ($problems !== []) {
            foreach ($problems as $problem) {
                $errors[] = "boardProfile: {$problem}";
            }

            return null;
        }

        $profile = [
            'id' => $id,
            'name' => $name,
            'outer' => $outer,
            'corner' => $corner,
            'border' => $border,
            'panels' => $panels,
            'boxLid' => ['w' => $boxLid['w'], 'h' => $boxLid['h']],
        ];

        if (($value['provisional'] ?? null) === true) {
            $profile['provisional'] = true;
        }

        return $profile;
    }

    /**
     * The same checks as validateProfile in lib/print/board.ts.
     *
     * @return list<string>
     */
    private function profileProblems(int|float $outer, int|float $corner, int|float $border, int|float $lidWidth, int|float $lidHeight): array
    {
        $errors = [];

        if ($outer <= 0) {
            $errors[] = 'the outer size must be greater than 0 mm';
        }

        if ($corner <= 0) {
            $errors[] = 'the corner size must be greater than 0 mm';
        }

        if ($border < 0) {
            $errors[] = 'the border cannot be negative';
        }

        if ($lidWidth <= 0 || $lidHeight <= 0) {
            $errors[] = 'the box lid size must be greater than 0 mm';
        }

        if ($errors !== []) {
            return $errors;
        }

        $inner = $outer - 2 * $border;

        if ($inner <= 0) {
            return ['the border leaves no room on this board size'];
        }

        if (2 * $corner + 9 * self::MIN_SPACE_WIDTH > $inner) {
            $errors[] = 'a corner space plus 9 spaces does not fit the board';
        }

        if ($inner - 2 * $corner <= 0) {
            $errors[] = 'the board centre disappears: choose smaller corner spaces';
        }

        return $errors;
    }

    private function isCurrency(string $id): bool
    {
        return array_any($this->standard->currencies(), fn (array $currency): bool => $currency['id'] === $id);
    }

    private function isString(mixed $value, int $max): bool
    {
        return is_string($value) && mb_strlen($value) <= $max;
    }

    /**
     * @phpstan-assert-if-true int|float $value
     */
    private function isNumber(mixed $value): bool
    {
        return is_int($value) || (is_float($value) && is_finite($value));
    }

    /**
     * A decoded JSON object is an array that is not a list. An empty array
     * counts, because `{}` and `[]` decode the same.
     *
     * @phpstan-assert-if-true array<array-key, mixed> $value
     */
    private function isObject(mixed $value): bool
    {
        return is_array($value) && ($value === [] || ! array_is_list($value));
    }

    /**
     * @param list<string> $errors
     */
    private function exception(array $errors): ValidationException
    {
        return ValidationException::withMessages(['edition' => $errors === [] ? ['invalid edition'] : $errors]);
    }
}
