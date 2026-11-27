<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Modules\Print\ValueObjects\PrintEdition;
use Illuminate\Support\Facades\Config;

final class BoardProfile
{
    /**
     * The board profile for layout: the edition's own, or the default.
     *
     * @return array{outer: float, corner: float, border: float, panels: int, boxLidWidth: float, boxLidHeight: float}
     */
    public static function of(PrintEdition $edition): array
    {
        $outer = Config::float('printopoly.print.profile.outer');
        $corner = Config::float('printopoly.print.profile.corner');
        $lidWidth = Config::float('printopoly.print.profile.box_lid.w');
        $lidHeight = Config::float('printopoly.print.profile.box_lid.h');
        $profile = $edition->boardProfile;

        if ($profile === null) {
            return ['outer' => $outer, 'corner' => $corner, 'border' => 0.0, 'panels' => 4, 'boxLidWidth' => $lidWidth, 'boxLidHeight' => $lidHeight];
        }

        $lid = is_array($profile['boxLid'] ?? null) ? $profile['boxLid'] : [];

        return [
            'outer' => self::float($profile['outer'] ?? null, $outer),
            'corner' => self::float($profile['corner'] ?? null, $corner),
            'border' => self::float($profile['border'] ?? null, 0.0),
            'panels' => ($profile['panels'] ?? 4) === 2 ? 2 : 4,
            'boxLidWidth' => self::float($lid['w'] ?? null, $lidWidth),
            'boxLidHeight' => self::float($lid['h'] ?? null, $lidHeight),
        ];
    }

    private static function float(mixed $value, float $default): float
    {
        return is_numeric($value) ? (float) $value : $default;
    }
}
