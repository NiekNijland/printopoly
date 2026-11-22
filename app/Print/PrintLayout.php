<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\BoardForm;
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
    /**
     * Room outside the bleed of a print-shop page for the crop marks (B160), the same as MARKS in composition.ts.
     * The TrimBox lies MARKS plus the bleed inside the page, the BleedBox MARKS inside it.
     */
    public const float MARKS = 6;

    private const float CARD_WIDTH = 63;

    private const float CARD_HEIGHT = 88;

    /** Space between two cards on a home sheet; each card bleeds into half of it (B134). */
    private const float DUPLEX_GAP = 3;

    private const float NOTE_WIDTH = 130;

    private const float NOTE_HEIGHT = 60;

    private const float TOKEN_WIDTH = 40;

    private const float TOKEN_HEIGHT = 55;

    private const int TOKENS = 8;

    /** The rules booklet: sixteen A5 pages (B123), four A4 sheets printed on both sides at home. */
    private const float BOOKLET_WIDTH = 148;

    private const float BOOKLET_HEIGHT = 210;

    private const int BOOKLET_PAGES = 16;

    private const float INVITATION_WIDTH = 105;

    private const float INVITATION_HEIGHT = 148;

    /** Room around a piece of the box lid on A4, and the strip the next piece lies on (LID_MARGIN, LID_OVERLAP). */
    private const float LID_MARGIN = 10;

    private const float LID_OVERLAP = 10;

    private const float A4_WIDTH = 210;

    private const float A4_HEIGHT = 297;

    public static function expect(PrintPart $part, PrintSet $set, PrintEditionData $edition): ExpectedPdf
    {
        $bleed = config()->float('printopoly.print.bleed_mm');
        $profile = $edition->profile();

        return match ($part) {
            PrintPart::Board => match (true) {
                $set === PrintSet::Home => new ExpectedPdf(HomeStickerPlan::sheets($profile['outer'], $profile['corner'], $profile['border']), self::A4_WIDTH, self::A4_HEIGHT),
                $edition->boardForm === BoardForm::Whole => self::wholeBoard($profile, $bleed),
                default => self::boardPanels($profile, $bleed),
            },
            PrintPart::Cards => self::cards($set, $edition->cardCount(), $bleed, $edition->sets),
            PrintPart::Money => self::money($set, $edition->moneyAmountFor($set)->total(), $edition->sets),
            PrintPart::Tokens => self::sheets(Imposition::plan(self::TOKEN_WIDTH, self::TOKEN_HEIGHT, 0, 210, 297, 8, 3, self::TOKENS)),
            PrintPart::BoxLid => self::boxLid($set, $profile, $bleed),
            PrintPart::RulesBooklet => $set === PrintSet::Printer
                ? new ExpectedPdf(self::BOOKLET_PAGES, self::BOOKLET_WIDTH + 2 * ($bleed + self::MARKS), self::BOOKLET_HEIGHT + 2 * ($bleed + self::MARKS))
                : new ExpectedPdf(self::BOOKLET_PAGES / 2, self::A4_HEIGHT, self::A4_WIDTH),
            PrintPart::Invitation => $set === PrintSet::Printer
                ? new ExpectedPdf(1, self::INVITATION_WIDTH + 2 * ($bleed + self::MARKS), self::INVITATION_HEIGHT + 2 * ($bleed + self::MARKS))
                : new ExpectedPdf(1, self::A4_WIDTH, self::A4_HEIGHT),
            PrintPart::Calibration => new ExpectedPdf(1, self::A4_WIDTH, self::A4_HEIGHT),
        };
    }

    /**
     * Where the finished invitation sits on its PDF page, in mm: inside the bleed for the print shop, in the
     * top left corner of the A4 sheet for home. The PNG is cut out of there.
     *
     * @return array{x: float, y: float, w: float, h: float}
     */
    public static function invitationCard(PrintSet $set, float $bleed): array
    {
        $offset = $set === PrintSet::Printer ? $bleed + self::MARKS : 0.0;

        return ['x' => $offset, 'y' => $offset, 'w' => self::INVITATION_WIDTH, 'h' => self::INVITATION_HEIGHT];
    }

    /**
     * @param array{outer: float, corner: float, border: float, panels: int, boxLidWidth: float, boxLidHeight: float} $profile
     */
    private static function boardPanels(array $profile, float $bleed): ExpectedPdf
    {
        // Two or four panels, each between the fold lines and the board edge minus 1 mm to
        // the edge and 1 mm to the fold (B64), plus bleed.
        $panel = self::panelTrim($profile);
        $width = $panel['w'] + 2 * ($bleed + self::MARKS);
        $height = $panel['h'] + 2 * ($bleed + self::MARKS);

        return new ExpectedPdf($profile['panels'], $width, $height);
    }

    /**
     * The board in one piece for the print shop (B243): the whole board at full size with bleed and crop marks.
     *
     * @param array{outer: float, corner: float, border: float, panels: int, boxLidWidth: float, boxLidHeight: float} $profile
     */
    private static function wholeBoard(array $profile, float $bleed): ExpectedPdf
    {
        $size = $profile['outer'] + 2 * ($bleed + self::MARKS);

        return new ExpectedPdf(1, $size, $size);
    }

    /**
     * Every set comes after the other in the same PDF, each with its own set mark (B242); the alignment test of the
     * home cards comes once, at the front.
     */
    private static function cards(PrintSet $set, int $count, float $bleed, int $sets = 1): ExpectedPdf
    {
        if ($count === 0) {
            throw new PrintFailed('The edition has no cards to print.');
        }

        if ($set === PrintSet::Printer) {
            return new ExpectedPdf($count * 2 * $sets, self::CARD_WIDTH + 2 * ($bleed + self::MARKS), self::CARD_HEIGHT + 2 * ($bleed + self::MARKS));
        }

        // Printed on both sides (B134): 3 x 3 cards on A4 portrait, 3 mm apart with 1.5 mm bleed each, every
        // sheet a page of fronts and a page of mirrored backs, after a front and back page with the alignment test.
        $plan = Imposition::plan(self::CARD_WIDTH, self::CARD_HEIGHT, self::DUPLEX_GAP / 2, self::A4_WIDTH, self::A4_HEIGHT, 6, 0, $count, 'portrait');

        return new ExpectedPdf(2 + 2 * $plan->sheets * $sets, $plan->sheetWidth, $plan->sheetHeight);
    }

    /**
     * The notes of every set, each set on sheets of its own (B242).
     */
    private static function money(PrintSet $set, int $notes, int $sets = 1): ExpectedPdf
    {
        $printer = $set === PrintSet::Printer;
        $plan = Imposition::plan(
            self::NOTE_WIDTH,
            self::NOTE_HEIGHT,
            0,
            $printer ? 320 : 210,
            $printer ? 450 : 297,
            $printer ? 5 : 8,
            3,
            $notes,
        );

        return new ExpectedPdf($plan->sheets * $sets, $plan->sheetWidth, $plan->sheetHeight);
    }

    /**
     * @param array{outer: float, corner: float, border: float, panels: int, boxLidWidth: float, boxLidHeight: float} $profile
     */
    private static function boxLid(PrintSet $set, array $profile, float $bleed): ExpectedPdf
    {
        $width = $profile['boxLidWidth'];
        $height = $profile['boxLidHeight'];

        if ($set === PrintSet::Printer) {
            return new ExpectedPdf(1, $width + 2 * ($bleed + self::MARKS), $height + 2 * ($bleed + self::MARKS));
        }

        // At home on A4, in overlapping pieces when it is larger (R5-29); `lidTiles` in lid-tiles.ts does the same.
        $portrait = [self::lidPieces($width, self::A4_WIDTH, $bleed), self::lidPieces($height, self::A4_HEIGHT, $bleed)];
        $landscape = [self::lidPieces($width, self::A4_HEIGHT, $bleed), self::lidPieces($height, self::A4_WIDTH, $bleed)];

        return $landscape[0] * $landscape[1] < $portrait[0] * $portrait[1]
            ? new ExpectedPdf($landscape[0] * $landscape[1], self::A4_HEIGHT, self::A4_WIDTH)
            : new ExpectedPdf($portrait[0] * $portrait[1], self::A4_WIDTH, self::A4_HEIGHT);
    }

    /**
     * Pieces of the lid along one side of an A4 sheet: one when it fits with its bleed, else overlapping pieces.
     */
    private static function lidPieces(float $length, float $sheet, float $bleed): int
    {
        $room = $sheet - 2 * self::LID_MARGIN;

        if ($length + 2 * $bleed <= $room + 1e-9) {
            return 1;
        }

        return (int) ceil($length / ($room - $bleed - self::LID_OVERLAP) - 1e-9);
    }

    /**
     * The finished size of one board panel in mm: between the fold lines and the board edge, 1 mm off each (B64).
     * The print page, the instruction and the PDF check all read it from here (bug 22 of test round 3).
     *
     * @param array{outer: float, corner: float, border: float, panels: int, boxLidWidth: float, boxLidHeight: float} $profile
     * @return array{w: float, h: float}
     */
    public static function panelTrim(array $profile): array
    {
        return [
            'w' => $profile['outer'] / 2 - 2,
            'h' => ($profile['panels'] === 4 ? $profile['outer'] / 2 : $profile['outer']) - 2,
        ];
    }

    /**
     * Whether the part of this set is a print-shop page with bleed and crop marks (B160), which gets a TrimBox and
     * a BleedBox.
     */
    public static function hasMarks(PrintPart $part, PrintSet $set): bool
    {
        return $set === PrintSet::Printer
            && in_array($part, [PrintPart::Board, PrintPart::Cards, PrintPart::BoxLid, PrintPart::RulesBooklet, PrintPart::Invitation], true);
    }

    private static function sheets(Imposition $imposition): ExpectedPdf
    {
        return new ExpectedPdf($imposition->sheets, $imposition->sheetWidth, $imposition->sheetHeight);
    }
}
