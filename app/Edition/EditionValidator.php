<?php

declare(strict_types=1);

namespace App\Edition;

use App\Enums\Locale;
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
 * @phpstan-type Photo array{photoId: string, cx: int|float, cy: int|float, scale: int|float, rotation: int|float, grayscale: bool}
 * @phpstan-type Override array<string, mixed>
 * @phpstan-type Profile array{id: string, name: string, outer: int|float, corner: int|float, border: int|float, panels: int, boxLid: array{w: int|float, h: int|float}, provisional?: true}
 * @phpstan-type Parts array<string, bool>
 * @phpstan-type Settings array{name?: string, language?: string, currency?: string, theme?: string, boardProfile?: Profile, parts?: Parts}
 * @phpstan-type EditionInput array{schemaVersion: int, id: string, name: string, language: string, currency: string, theme: string, boardProfile: Profile, parts: Parts, elements: array<string, Override>, revision: int, createdAt: int, updatedAt: int}
 * @phpstan-type PatchInput array{baseRevision: int, name?: string, language?: string, currency?: string, theme?: string, boardProfile?: Profile, parts?: Parts, elements?: array<string, Override|null>}
 */
final readonly class EditionValidator
{
    public const int SCHEMA_VERSION = 1;

    public const int MAX_NAME_LENGTH = 120;

    public const int MAX_TEXT_LENGTH = 2000;

    public const int MAX_LAYERS = 24;

    /** More than every key there is, so only abuse hits it. */
    public const int MAX_ELEMENTS = 200;

    /** Smallest space width in mm; the same as MIN_SPACE_WIDTH in lib/print/board.ts. */
    private const int MIN_SPACE_WIDTH = 15;

    private const array THEMES = ['classic', 'riso', 'strak'];

    private const array LAYOUTS = ['frame', 'full', 'text'];

    private const array PARTS = ['board', 'deeds', 'cards', 'money', 'pawns', 'boxLid', 'houseRules'];

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

        $elements = $this->parseElements($input['elements'] ?? null, $errors);

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
        ];
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
     * @param list<string> $errors
     * @return array<string, Override|null>|null
     */
    private function parseElementChanges(mixed $value, array &$errors): ?array
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

            if (! in_array($field, $allowed, true)) {
                $errors[] = "{$at}: field is not allowed here";

                continue;
            }

            $parsed = $this->parseField($field, $fieldValue, $at, $errors);

            if ($parsed !== null) {
                $out[$field] = $parsed;
            }
        }

        return count($errors) === $before ? $out : null;
    }

    /**
     * @param list<string> $errors
     */
    private function parseField(string $field, mixed $value, string $at, array &$errors): mixed
    {
        switch ($field) {
            case 'name':
                if ($this->isString($value, self::MAX_NAME_LENGTH)) {
                    return $value;
                }

                $errors[] = "{$at}: must be a string of at most " . self::MAX_NAME_LENGTH . ' characters';

                return null;
            case 'text':
                if ($this->isString($value, self::MAX_TEXT_LENGTH)) {
                    return $value;
                }

                $errors[] = "{$at}: must be a string of at most " . self::MAX_TEXT_LENGTH . ' characters';

                return null;
            case 'layout':
                if (is_string($value) && in_array($value, self::LAYOUTS, true)) {
                    return $value;
                }

                $errors[] = "{$at}: unknown layout";

                return null;
            case 'amount':
                if ($this->isNumber($value)) {
                    return $value;
                }

                $errors[] = "{$at}: must be a number";

                return null;
            case 'photo':
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
        $valid = true;

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

        return [
            'photoId' => $photoId,
            'cx' => $cx,
            'cy' => $cy,
            'scale' => $scale,
            'rotation' => $rotation,
            'grayscale' => $grayscale,
        ];
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
        $kind = $value['kind'] ?? null;

        if ($kind === 'text') {
            $text = $value['text'] ?? null;

            if (! $this->isString($text, self::MAX_TEXT_LENGTH)) {
                $errors[] = "{$at}: text must be a string of at most " . self::MAX_TEXT_LENGTH . ' characters';

                return null;
            }

            return [...$box, 'kind' => 'text', 'text' => $text];
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
            $flag = $value[$id] ?? null;

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
