<?php

declare(strict_types=1);

namespace App\Print;

/**
 * How many equal items fit on a sheet and which way the sheet turns. A port of
 * `impose` in resources/js/lib/print/imposition.ts, only the part the PDF
 * check needs: the sheet size and the number of sheets. The numbers must
 * match; resources/js/lib/print/composition.test.ts and
 * tests/Unit/Print/PrintLayoutTest.php hold the same table.
 */
final readonly class Imposition
{
    private function __construct(
        public float $sheetWidth,
        public float $sheetHeight,
        public int $perSheet,
        public int $sheets,
    ) {
    }

    /**
     * @param string $orientation 'auto', 'portrait' or 'landscape'
     */
    public static function plan(
        float $itemWidth,
        float $itemHeight,
        float $bleed,
        float $sheetWidth,
        float $sheetHeight,
        float $margin,
        float $gap,
        int $count,
        string $orientation = 'auto',
    ): self {
        $slotWidth = $itemWidth + 2 * $bleed;
        $slotHeight = $itemHeight + 2 * $bleed;

        $best = null;
        foreach (['portrait', 'landscape'] as $candidate) {
            if ($orientation !== 'auto' && $orientation !== $candidate) {
                continue;
            }

            $pageWidth = $candidate === 'portrait' ? $sheetWidth : $sheetHeight;
            $pageHeight = $candidate === 'portrait' ? $sheetHeight : $sheetWidth;
            $total = self::fit($pageWidth - 2 * $margin, $slotWidth, $gap) * self::fit($pageHeight - 2 * $margin, $slotHeight, $gap);

            // On a tie the first candidate (portrait) wins.
            if ($best === null || $total > $best['total']) {
                $best = ['total' => $total, 'width' => $pageWidth, 'height' => $pageHeight];
            }
        }

        if ($best === null || $best['total'] === 0) {
            throw new PrintFailed('An item does not fit on the sheet.');
        }

        return new self($best['width'], $best['height'], $best['total'], (int) ceil($count / $best['total']));
    }

    private static function fit(float $available, float $slot, float $gap): int
    {
        return max(0, (int) floor(($available + $gap) / ($slot + $gap) + 1e-9));
    }
}
