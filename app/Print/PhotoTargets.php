<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\PrintSet;

/**
 * The frame size in mm of every visible photo, as the browser measured it from the renderers (per set,
 * `element#photo` to `{w, h}`). Only the shape is checked here; `PrintEditionData::withTargets` holds the
 * sizes to sane limits.
 */
final class PhotoTargets
{
    private const int MAX_PER_SET = 600;

    /**
     * @return array<string, array<string, array{w: float, h: float}>>
     */
    public static function clean(mixed $value): array
    {
        $clean = [];

        foreach (PrintSet::cases() as $set) {
            $forSet = is_array($value) && is_array($value[$set->value] ?? null) ? $value[$set->value] : [];
            $clean[$set->value] = [];

            foreach ($forSet as $key => $size) {
                if (count($clean[$set->value]) >= self::MAX_PER_SET) {
                    break;
                }

                if (is_string($key) && strlen($key) <= 64 && is_array($size) && is_numeric($size['w'] ?? null) && is_numeric($size['h'] ?? null)) {
                    $clean[$set->value][$key] = ['w' => (float) $size['w'], 'h' => (float) $size['h']];
                }
            }
        }

        return $clean;
    }
}
