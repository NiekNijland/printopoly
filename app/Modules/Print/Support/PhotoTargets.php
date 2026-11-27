<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Modules\Print\Enums\PrintSet;

/**
 * The frame size in mm of every visible photo, as the browser measured it from the renderers (per set,
 * `element#photo` to `{w, h}`). Only the shape is checked here; `PrintEdition::withTargets` holds the
 * sizes to sane limits.
 */
final class PhotoTargets
{
    private const int MAX_PER_SET = 600;

    /**
     * @param array<mixed> $value
     * @return array<string, array<string, array{w: float, h: float}>>
     */
    public static function clean(array $value): array
    {
        $clean = [];

        foreach (PrintSet::cases() as $set) {
            $forSet = is_array($value[$set->value] ?? null) ? $value[$set->value] : [];
            $clean[$set->value] = [];

            foreach ($forSet as $key => $size) {
                if (count($clean[$set->value]) >= self::MAX_PER_SET) {
                    break;
                }

                if (is_string($key) && mb_strlen($key, encoding: '8bit') <= 64 && is_array($size) && is_numeric($size['w'] ?? null) && is_numeric($size['h'] ?? null)) {
                    $clean[$set->value][$key] = ['w' => (float) $size['w'], 'h' => (float) $size['h']];
                }
            }
        }

        return $clean;
    }
}
