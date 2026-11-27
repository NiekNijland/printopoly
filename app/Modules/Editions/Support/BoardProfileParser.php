<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

/**
 * @phpstan-import-type Profile from EditionValidator
 */
final readonly class BoardProfileParser
{
    /** Smallest space width in mm; the same as MIN_SPACE_WIDTH in lib/render/print-board.ts. */
    private const int MIN_SPACE_WIDTH = 15;

    /**
     * @param list<string> $errors
     * @return Profile|null
     */
    public function parse(mixed $value, array &$errors): ?array
    {
        if (! JsonValue::isObject($value)) {
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

        if (! is_string($id) || $id === '' || mb_strlen($id, encoding: '8bit') > 64 || ! is_string($name) || ! JsonValue::isString($name, EditionValidator::MAX_NAME_LENGTH)) {
            $errors[] = 'boardProfile: id and name must be strings';

            return null;
        }

        if (! JsonValue::isObject($boxLid) || ! JsonValue::isNumber($boxLid['w'] ?? null) || ! JsonValue::isNumber($boxLid['h'] ?? null)) {
            $errors[] = 'boardProfile.boxLid: w and h must be numbers';

            return null;
        }

        if (! JsonValue::isNumber($outer) || ! JsonValue::isNumber($corner) || ! JsonValue::isNumber($border) || ($panels !== 2 && $panels !== 4)) {
            $errors[] = 'boardProfile: outer, corner, border and panels (2 or 4) are required numbers';

            return null;
        }

        $problems = $this->problems($outer, $corner, $border, $boxLid['w'], $boxLid['h']);

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
     * The same checks as validateProfile in lib/render/print-board.ts.
     *
     * @return list<string>
     */
    private function problems(int|float $outer, int|float $corner, int|float $border, int|float $lidWidth, int|float $lidHeight): array
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
}
