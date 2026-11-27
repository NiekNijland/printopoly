<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Modules\Print\ValueObjects\PrintEdition;
use App\Support\JsonShape;
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
            'outer' => JsonShape::floatOr($profile['outer'] ?? null, $outer),
            'corner' => JsonShape::floatOr($profile['corner'] ?? null, $corner),
            'border' => JsonShape::floatOr($profile['border'] ?? null, 0.0),
            'panels' => ($profile['panels'] ?? 4) === 2 ? 2 : 4,
            'boxLidWidth' => JsonShape::floatOr($lid['w'] ?? null, $lidWidth),
            'boxLidHeight' => JsonShape::floatOr($lid['h'] ?? null, $lidHeight),
        ];
    }
}
