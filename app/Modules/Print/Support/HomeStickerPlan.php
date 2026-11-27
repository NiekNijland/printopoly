<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Modules\Print\Exceptions\PrintFailedException;

/**
 * How many A4 sheets the home version of the board needs: a PHP port of `stickerPieces` and
 * `packStickers` (resources/js/lib/render/print-home-stickers.ts), so the PDF check works for any board profile
 * (B65, B107). Every space and the four centre pieces is a sticker 0.5 mm smaller than its region, plus
 * 3 mm bleed, packed in shelves on A4 with 8 mm margin and 3 mm between stickers.
 */
final class HomeStickerPlan
{
    private const float INSET = 0.5;

    private const float BLEED = 3.0;

    private const float SHEET_WIDTH = 210.0;

    private const float SHEET_HEIGHT = 297.0;

    private const float MARGIN = 8.0;

    private const float GAP = 3.0;

    private const float EPS = 1e-9;

    /**
     * @throws PrintFailedException when a sticker does not fit on a sheet.
     */
    public static function sheets(float $outer, float $corner, float $border): int
    {
        return self::pack(self::oriented(self::pieces($outer, $corner, $border)));
    }

    /**
     * [width, height] of every piece with bleed, in board orientation.
     *
     * @return list<array{float, float}>
     */
    private static function pieces(float $outer, float $corner, float $border): array
    {
        $spaceWidth = ($outer - 2 * $border - 2 * $corner) / 9;
        $centre = $outer - 2 * ($border + $corner);
        $middle = $outer / 2;
        $centreStart = $border + $corner;
        $extra = 2 * (self::BLEED - self::INSET);

        $pieces = [];
        for ($i = 0; $i < 4; $i++) {
            $pieces[] = [$corner + $extra, $corner + $extra];
        }

        for ($i = 0; $i < 18; $i++) {
            $pieces[] = [$spaceWidth + $extra, $corner + $extra];
            $pieces[] = [$corner + $extra, $spaceWidth + $extra];
        }

        foreach ([$middle - $centreStart, $centreStart + $centre - $middle] as $width) {
            foreach ([$middle - $centreStart, $centreStart + $centre - $middle] as $height) {
                $pieces[] = [$width + $extra, $height + $extra];
            }
        }

        return $pieces;
    }

    /**
     * @param list<array{float, float}> $pieces
     * @return list<array{float, float}>
     *
     * @throws PrintFailedException
     */
    private static function oriented(array $pieces): array
    {
        $oriented = [];
        foreach ($pieces as [$width, $height]) {
            $long = max($width, $height);
            $short = min($width, $height);

            if ($long <= self::usableWidth() + self::EPS && $short <= self::usableHeight() + self::EPS) {
                $oriented[] = [$long, $short];
            } elseif ($short <= self::usableWidth() + self::EPS && $long <= self::usableHeight() + self::EPS) {
                $oriented[] = [$short, $long];
            } else {
                throw new PrintFailedException('A board sticker does not fit on an A4 sheet.');
            }
        }

        // Tallest first, then widest: the same order as the browser.
        usort($oriented, static function (array $a, array $b): int {
            $byHeight = $b[1] <=> $a[1];

            return $byHeight !== 0 ? $byHeight : $b[0] <=> $a[0];
        });

        return $oriented;
    }

    /**
     * @param list<array{float, float}> $oriented
     */
    private static function pack(array $oriented): int
    {
        $sheets = [];

        foreach ($oriented as [$width, $height]) {
            $placed = false;

            // Sheet by sheet, as the browser does: an open shelf first, then a new shelf on that sheet.
            foreach ($sheets as $index => $shelves) {
                foreach ($shelves as $shelf) {
                    if ($height <= $shelf->height + self::EPS && $shelf->x + $width <= self::usableWidth() + self::EPS) {
                        $shelf->x += $width + self::GAP;
                        $placed = true;

                        break 2;
                    }
                }

                $last = array_last($shelves);
                $top = $last->y + $last->height + self::GAP;

                if ($top + $height <= self::usableHeight() + self::EPS) {
                    $sheets[$index][] = new HomeStickerShelf($top, $height, $width + self::GAP);
                    $placed = true;

                    break;
                }
            }

            if (! $placed) {
                $sheets[] = [new HomeStickerShelf(0.0, $height, $width + self::GAP)];
            }
        }

        return count($sheets);
    }

    private static function usableWidth(): float
    {
        return self::SHEET_WIDTH - 2 * self::MARGIN;
    }

    private static function usableHeight(): float
    {
        return self::SHEET_HEIGHT - 2 * self::MARGIN;
    }
}
