<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use Illuminate\Validation\ValidationException;

/**
 * Server-side twin of resources/js/lib/render/edition-schema.ts: the same rules for
 * an edition, a board profile and one element override. Whatever the browser
 * accepts, the server accepts, and the other way around. Unknown fields are
 * dropped and unknown element keys are errors.
 *
 * Messages name the path, such as `elements.space.01.name`.
 *
 * @phpstan-import-type Selection from PrintSelection
 *
 * @phpstan-type Override array<string, mixed>
 * @phpstan-type Profile array{id: string, name: string, outer: int|float, corner: int|float, border: int|float, panels: int, boxLid: array{w: int|float, h: int|float}, provisional?: true}
 * @phpstan-type Parts array<string, bool>
 * @phpstan-type Settings array{name?: string, language?: string, currency?: string, theme?: string, boardProfile?: Profile, parts?: Parts, moneyAmount?: string|null, printSelection?: Selection|null}
 * @phpstan-type EditionInput array{schemaVersion: int, id: string, name: string, language: string, currency: string, theme: string, boardProfile: Profile, parts: Parts, elements: array<string, Override>, template?: string, moneyAmount?: string, printSelection?: Selection, revision: int, createdAt: int, updatedAt: int}
 * @phpstan-type PatchInput array{baseRevision: int, name?: string, language?: string, currency?: string, theme?: string, boardProfile?: Profile, parts?: Parts, moneyAmount?: string|null, printSelection?: Selection|null, elements?: array<string, Override|null>}
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

    /** Longest house, hotel, jail, deck or currency name; the same as MAX_WORD_LENGTH in lib/render/edition-words.ts. */
    public const int MAX_WORD_LENGTH = 40;

    /** Longest currency symbol. */
    public const int MAX_SYMBOL_LENGTH = 6;

    /** Longest short text on a corner of the board. */
    public const int MAX_CORNER_TEXT_LENGTH = 120;

    /** Longest purpose on a card ("your language course"); the same as MAX_PURPOSE_LENGTH in schema.ts. */
    public const int MAX_PURPOSE_LENGTH = 60;

    /** Longest story on the back of a title deed (B169); the same as MAX_STORY_LENGTH in schema.ts. */
    public const int MAX_STORY_LENGTH = 160;

    /** Smallest title ribbon on the board centre (B170); the same as MIN_TITLE_SCALE in schema.ts. */
    public const float MIN_TITLE_SCALE = 0.5;

    /** More than every key there is, so only abuse hits it. */
    public const int MAX_ELEMENTS = 200;

    /** The templates an edition can carry (B127, B152, B193); the same as KNOWN_TEMPLATE_IDS in lib/render/edition-types.ts. */
    public const array TEMPLATES = ['village', 'family', 'friends', 'party', 'wedding', 'group', 'company', 'school', 'club', 'bachelor', 'birthday', 'kidsparty', 'club1', 'birthday1', 'empty'];

    public function __construct(private EditionSettingsParser $settings, private ElementsParser $elements)
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

        $out = $this->settings->parse($input, $errors);

        if (array_key_exists('elements', $input)) {
            $changes = $this->elements->changes($input['elements'], $errors);

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

        $settings = $this->settings->parse($input, $errors);
        $revision = $input['revision'] ?? null;

        if (! is_int($revision) || $revision < 0) {
            $errors[] = 'revision: must be a non-negative integer';
        }

        $createdAt = $input['createdAt'] ?? null;
        $updatedAt = $input['updatedAt'] ?? null;

        if (! JsonValue::isNumber($createdAt)) {
            $errors[] = 'createdAt: must be a number';
        }

        if (! JsonValue::isNumber($updatedAt)) {
            $errors[] = 'updatedAt: must be a number';
        }

        $elements = $this->elements->all($input['elements'] ?? null, $errors);

        if (
            $errors !== []
            || ! is_string($id)
            || ! is_int($revision)
            || ! JsonValue::isNumber($createdAt)
            || ! JsonValue::isNumber($updatedAt)
            || $elements === null
            || ! isset($settings['name'], $settings['language'], $settings['currency'], $settings['theme'], $settings['boardProfile'], $settings['parts'])
        ) {
            return null;
        }

        return [
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
            ...$this->choices($input['template'] ?? null, $settings),
        ];
    }

    /**
     * The template the edition started from (B152), only a known one, and the money and print choices when set.
     *
     * @param Settings $settings
     * @return array{template?: string, moneyAmount?: string, printSelection?: Selection}
     */
    private function choices(mixed $template, array $settings): array
    {
        $choices = [];

        if (is_string($template) && in_array($template, self::TEMPLATES, true)) {
            $choices['template'] = $template;
        }

        if (is_string($settings['moneyAmount'] ?? null)) {
            $choices['moneyAmount'] = $settings['moneyAmount'];
        }

        if (isset($settings['printSelection'])) {
            $choices['printSelection'] = $settings['printSelection'];
        }

        return $choices;
    }

    /**
     * @param list<string> $errors
     */
    private function exception(array $errors): ValidationException
    {
        return ValidationException::withMessages(['edition' => $errors === [] ? ['invalid edition'] : $errors]);
    }
}
