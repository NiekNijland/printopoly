<?php

declare(strict_types=1);

namespace App\Print;

/**
 * How many A4 sheets the home version of the board needs: a PHP port of `stickerPieces` and
 * `packStickers` (resources/js/lib/print/home-stickers.ts), so the PDF check works for any board profile
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
     * @throws PrintFailed when a sticker does not fit on a sheet.
     */
    public static function sheets(float $outer, float $corner, float $border): int
    {
        $spaceWidth = ($outer - 2 * $border - 2 * $corner) / 9;
        $centre = $outer - 2 * ($border + $corner);
        $middle = $outer / 2;
        $centreStart = $border + $corner;
        $extra = 2 * (self::BLEED - self::INSET);

        // [width, height] of every piece with bleed, in board orientation.
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

        $usableWidth = self::SHEET_WIDTH - 2 * self::MARGIN;
        $usableHeight = self::SHEET_HEIGHT - 2 * self::MARGIN;

        $oriented = [];
        foreach ($pieces as [$width, $height]) {
            $long = max($width, $height);
            $short = min($width, $height);

            if ($long <= $usableWidth + self::EPS && $short <= $usableHeight + self::EPS) {
                $oriented[] = [$long, $short];
            } elseif ($short <= $usableWidth + self::EPS && $long <= $usableHeight + self::EPS) {
                $oriented[] = [$short, $long];
            } else {
                throw new PrintFailed('A board sticker does not fit on an A4 sheet.');
            }
        }

        // Tallest first, then widest: the same order as the browser.
        usort($oriented, static fn (array $a, array $b): int => $b[1] <=> $a[1] ?: $b[0] <=> $a[0]);

        /** @var list<list<array{y: float, h: float, x: float}>> $sheets */
        $sheets = [];

        foreach ($oriented as [$width, $height]) {
            $placed = false;

            foreach ($sheets as $index => $shelves) {
                foreach ($shelves as $shelfIndex => $shelf) {
                    if ($height <= $shelf['h'] + self::EPS && $shelf['x'] + $width <= $usableWidth + self::EPS) {
                        $sheets[$index][$shelfIndex]['x'] += $width + self::GAP;
                        $placed = true;

                        break 2;
                    }
                }

                $last = $shelves[array_key_last($shelves)];
                $top = $last['y'] + $last['h'] + self::GAP;

                if ($top + $height <= $usableHeight + self::EPS) {
                    $sheets[$index][] = ['y' => $top, 'h' => $height, 'x' => $width + self::GAP];
                    $placed = true;

                    break;
                }
            }

            if (! $placed) {
                $sheets[] = [['y' => 0.0, 'h' => $height, 'x' => $width + self::GAP]];
            }
        }

        return count($sheets);
    }
}
