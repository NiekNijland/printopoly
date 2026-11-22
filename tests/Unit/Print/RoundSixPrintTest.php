<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\PrintCacheKey;
use App\Print\PrintEditionData;
use App\Print\PrintLayout;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Feedback round 5 on the PDFs: the test sheet in the edition's own currency (R5-26), the booklet that knows the
 * money is not in the set (R5-29, bug 34 of ronde 4) and the box lid on A4 at home (R5-29, Fatima).
 */
final class RoundSixPrintTest extends TestCase
{
    private function edition(): PrintEditionData
    {
        return PrintEditionData::fromArray([
            'name' => 'Opa Heinz',
            'currency' => 'custom',
            'parts' => ['money' => true, 'rulesBooklet' => true],
            'elements' => [
                'words.currency' => ['name' => 'Deutsche Mark', 'text' => 'DM'],
                'space.00' => ['amounts' => ['salary' => 240]],
                'space.01' => ['name' => 'Kastanienallee', 'amounts' => ['price' => 66], 'photo' => ['id' => 'x']],
                'space.06' => ['name' => 'Kombuiskade'],
                'pawn.01' => ['name' => 'Heinz'],
            ],
        ]);
    }

    #[Test]
    public function the_test_sheet_keeps_the_own_currency_and_the_two_spaces_it_draws(): void
    {
        $elements = $this->edition()->onlyFor(PrintPart::Calibration)->elements;

        self::assertSame(['name' => 'Deutsche Mark', 'text' => 'DM'], $elements['words.currency']);
        self::assertSame(['amounts' => ['salary' => 240]], $elements['space.00']);
        // The name and the price, not the photo: the sheet is for measuring.
        self::assertSame(['name' => 'Kastanienallee', 'amounts' => ['price' => 66]], $elements['space.01']);
        self::assertArrayNotHasKey('space.06', $elements);
        self::assertArrayNotHasKey('pawn.01', $elements);
    }

    #[Test]
    public function the_booklet_hears_that_the_money_is_not_in_the_set(): void
    {
        $out = $this->edition()->forSet(PrintSet::Home, null, moneyLeftOut: true);

        $booklet = $out->onlyFor(PrintPart::RulesBooklet)->toPrintPayload([]);
        self::assertFalse(((array) $booklet['parts'])['money']);

        // The money in the set: the booklet counts it, as before.
        $in = $this->edition()->forSet(PrintSet::Home, null)->onlyFor(PrintPart::RulesBooklet)->toPrintPayload([]);
        self::assertTrue(((array) $in['parts'])['money']);

        // Only the booklet changes: the board stays current when the money goes out of the set.
        self::assertSame(
            PrintCacheKey::make(PrintPart::Board, PrintSet::Home, $this->edition()->forSet(PrintSet::Home, null)->onlyFor(PrintPart::Board), []),
            PrintCacheKey::make(PrintPart::Board, PrintSet::Home, $out->onlyFor(PrintPart::Board), []),
        );
        self::assertNotSame(
            PrintCacheKey::make(PrintPart::RulesBooklet, PrintSet::Home, $this->edition()->forSet(PrintSet::Home, null)->onlyFor(PrintPart::RulesBooklet), []),
            PrintCacheKey::make(PrintPart::RulesBooklet, PrintSet::Home, $out->onlyFor(PrintPart::RulesBooklet), []),
        );
    }

    #[Test]
    public function the_box_lid_comes_on_a4_at_home(): void
    {
        $lid = static fn (float $w, float $h): array => (static function (PrintEditionData $edition): array {
            $expected = PrintLayout::expect(PrintPart::BoxLid, PrintSet::Home, $edition);

            return [$expected->pages, $expected->widthMm, $expected->heightMm];
        })(PrintEditionData::fromArray(['elements' => [], 'boardProfile' => ['outer' => 500, 'corner' => 70, 'border' => 0, 'panels' => 4, 'boxLid' => ['w' => $w, 'h' => $h]]]));

        // The standard lid of 267 mm: two pieces of A4 portrait, as lid-tiles.ts lays them out.
        self::assertSame([2, 210.0, 297.0], $lid(267, 267));
        // A small lid fits on one sheet.
        self::assertSame([1, 210.0, 297.0], $lid(150, 200));
        // Wide and low: one landscape sheet beats two portrait ones.
        self::assertSame([1, 297.0, 210.0], $lid(250, 150));
        // A large lid: more pieces.
        self::assertSame([6, 210.0, 297.0], $lid(400, 400));
    }
}
