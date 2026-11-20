<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;

/**
 * The page plan the PDF check holds a rendered PDF against (B12, B63). The
 * browser lays the pages out (resources/js/lib/print/composition.ts); this is
 * the independent expectation, so a renderer that draws the wrong number of
 * pages or a wrong sheet size fails the part instead of reaching the user.
 */
final readonly class PrintLayout
{
    private const float CARD_WIDTH = 63;

    private const float CARD_HEIGHT = 88;

    private const float NOTE_WIDTH = 130;

    private const float NOTE_HEIGHT = 60;

    private const int BANKNOTES = 210;

    private const float TOKEN_WIDTH = 40;

    private const float TOKEN_HEIGHT = 55;

    private const int TOKENS = 8;

    private const float A4_WIDTH = 210;

    private const float A4_HEIGHT = 297;

    public static function expect(PrintPart $part, PrintSet $set, PrintEditionData $edition): ExpectedPdf
    {
        $bleed = config()->float('printopoly.print.bleed_mm');
        $profile = $edition->profile();

        return match ($part) {
            PrintPart::Board => $set === PrintSet::Printer
                ? self::boardPanels($profile, $bleed)
                : new ExpectedPdf(HomeStickerPlan::sheets($profile['outer'], $profile['corner'], $profile['border']), self::A4_WIDTH, self::A4_HEIGHT),
            PrintPart::Cards => self::cards($set, $edition->cardCount(), $bleed),
            PrintPart::Money => self::money($set),
            PrintPart::Tokens => self::sheets(Imposition::plan(self::TOKEN_WIDTH, self::TOKEN_HEIGHT, 0, 210, 297, 8, 3, self::TOKENS)),
            PrintPart::BoxLid => self::boxLid($set, $profile, $bleed),
            PrintPart::Calibration => new ExpectedPdf(1, self::A4_WIDTH, self::A4_HEIGHT),
        };
    }

    /**
     * @param array{outer: float, corner: float, border: float, panels: int, boxLidWidth: float, boxLidHeight: float} $profile
     */
    private static function boardPanels(array $profile, float $bleed): ExpectedPdf
    {
        // Two or four panels, each between the fold lines and the board edge minus 1 mm to
        // the edge and 1 mm to the fold (B64), plus bleed.
        $width = $profile['outer'] / 2 - 2 + 2 * $bleed;
        $height = ($profile['panels'] === 4 ? $profile['outer'] / 2 : $profile['outer']) - 2 + 2 * $bleed;

        return new ExpectedPdf($profile['panels'], $width, $height);
    }

    private static function cards(PrintSet $set, int $count, float $bleed): ExpectedPdf
    {
        if ($count === 0) {
            throw new PrintFailed('The edition has no cards to print.');
        }

        if ($set === PrintSet::Printer) {
            return new ExpectedPdf($count * 2, self::CARD_WIDTH + 2 * $bleed, self::CARD_HEIGHT + 2 * $bleed);
        }

        // Fold cards: two cards side by side, A4 landscape (B8).
        return self::sheets(Imposition::plan(self::CARD_WIDTH * 2, self::CARD_HEIGHT, $bleed, 210, 297, 8, 3, $count, 'landscape'));
    }

    private static function money(PrintSet $set): ExpectedPdf
    {
        $printer = $set === PrintSet::Printer;

        return self::sheets(Imposition::plan(
            self::NOTE_WIDTH,
            self::NOTE_HEIGHT,
            0,
            $printer ? 320 : 210,
            $printer ? 450 : 297,
            $printer ? 5 : 8,
            3,
            self::BANKNOTES,
        ));
    }

    /**
     * @param array{outer: float, corner: float, border: float, panels: int, boxLidWidth: float, boxLidHeight: float} $profile
     */
    private static function boxLid(PrintSet $set, array $profile, float $bleed): ExpectedPdf
    {
        $width = $profile['boxLidWidth'];
        $height = $profile['boxLidHeight'];

        if ($set === PrintSet::Printer) {
            return new ExpectedPdf(1, $width + 2 * $bleed, $height + 2 * $bleed);
        }

        return self::sheets(Imposition::plan($width, $height, $bleed, 297, 420, 10, 3, 1));
    }

    private static function sheets(Imposition $imposition): ExpectedPdf
    {
        return new ExpectedPdf($imposition->sheets, $imposition->sheetWidth, $imposition->sheetHeight);
    }
}
