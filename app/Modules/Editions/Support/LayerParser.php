<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

final readonly class LayerParser
{
    /** The fonts and alignments of a text layer; the same as LAYER_FONTS and LAYER_ALIGNS in types.ts. */
    private const array LAYER_FONTS = ['heading', 'body', 'mono'];

    private const array LAYER_ALIGNS = ['left', 'center', 'right'];

    public function __construct(private PhotoParser $photos)
    {
    }

    /**
     * @param list<string> $errors
     * @return list<array<string, mixed>>|null
     */
    public function parse(mixed $value, string $at, array &$errors): ?array
    {
        if (! is_array($value) || ! array_is_list($value) || count($value) > EditionValidator::MAX_LAYERS) {
            $errors[] = "{$at}: must be a list of at most " . EditionValidator::MAX_LAYERS . ' layers';

            return null;
        }

        $before = count($errors);
        $layers = [];

        foreach ($value as $index => $item) {
            $layer = $this->layer($item, "{$at}[{$index}]", $errors);

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
    private function layer(mixed $value, string $at, array &$errors): ?array
    {
        if (! JsonValue::isObject($value)) {
            $errors[] = "{$at}: layer must be an object";

            return null;
        }

        $id = $value['id'] ?? null;

        if (! is_string($id) || $id === '' || mb_strlen($id, encoding: '8bit') > 128) {
            $errors[] = "{$at}: id must be a non-empty string";

            return null;
        }

        $x = $value['x'] ?? null;
        $y = $value['y'] ?? null;
        $w = $value['w'] ?? null;
        $h = $value['h'] ?? null;

        if (! JsonValue::isNumber($x) || ! JsonValue::isNumber($y) || ! JsonValue::isNumber($w) || ! JsonValue::isNumber($h)) {
            $errors[] = "{$at}: x, y, w and h must be numbers";

            return null;
        }

        $box = ['id' => $id, 'x' => $x, 'y' => $y, 'w' => $w, 'h' => $h];
        $rotation = $value['rotation'] ?? null;

        if ($rotation !== null) {
            if (! JsonValue::isNumber($rotation)) {
                $errors[] = "{$at}: rotation must be a number";

                return null;
            }

            $box['rotation'] = $rotation;
        }

        $kind = $value['kind'] ?? null;

        if ($kind === 'text') {
            return $this->textLayer($value, $box, $at, $errors);
        }

        if ($kind === 'photo') {
            $photo = $this->photos->parse($value['photo'] ?? null, "{$at}.photo", $errors);

            return $photo === null ? null : [...$box, 'kind' => 'photo', 'photo' => $photo];
        }

        $errors[] = "{$at}: kind must be \"text\" or \"photo\"";

        return null;
    }

    /**
     * @param array<array-key, mixed> $value
     * @param array<string, mixed> $box
     * @param list<string> $errors
     * @return array<string, mixed>|null
     */
    private function textLayer(array $value, array $box, string $at, array &$errors): ?array
    {
        $text = $value['text'] ?? null;

        if (! JsonValue::isString($text, EditionValidator::MAX_TEXT_LENGTH)) {
            $errors[] = "{$at}: text must be a string of at most " . EditionValidator::MAX_TEXT_LENGTH . ' characters';

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
}
