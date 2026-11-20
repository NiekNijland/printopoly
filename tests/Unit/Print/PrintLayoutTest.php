<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\PrintEditionData;
use App\Print\PrintFailed;
use App\Print\PrintLayout;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * The page plan the PDF check expects. The same table sits in
 * resources/js/lib/print/composition.test.ts: change both together.
 */
final class PrintLayoutTest extends TestCase
{
    /**
     * @return iterable<string, array{PrintPart, PrintSet, int, float, float}>
     */
    public static function plans(): iterable
    {
        yield 'board, print shop' => [PrintPart::Board, PrintSet::Printer, 4, 254, 254];
        yield 'board, home' => [PrintPart::Board, PrintSet::Home, 7, 210, 297];
        yield 'cards, print shop' => [PrintPart::Cards, PrintSet::Printer, 120, 69, 94];
        yield 'cards, home' => [PrintPart::Cards, PrintSet::Home, 15, 297, 210];
        yield 'money, print shop' => [PrintPart::Money, PrintSet::Printer, 15, 320, 450];
        yield 'money, home' => [PrintPart::Money, PrintSet::Home, 35, 297, 210];
        yield 'tokens' => [PrintPart::Tokens, PrintSet::Printer, 1, 297, 210];
        yield 'box lid, print shop' => [PrintPart::BoxLid, PrintSet::Printer, 1, 273, 273];
        yield 'box lid, home' => [PrintPart::BoxLid, PrintSet::Home, 1, 297, 420];
        yield 'test sheet' => [PrintPart::Calibration, PrintSet::Home, 1, 210, 297];
    }

    #[Test]
    #[DataProvider('plans')]
    public function it_plans_pages_and_sheet_size(PrintPart $part, PrintSet $set, int $pages, float $width, float $height): void
    {
        $expected = PrintLayout::expect($part, $set, PrintEditionData::fromArray(['elements' => []]));

        self::assertSame($pages, $expected->pages);
        self::assertEqualsWithDelta($width, $expected->widthMm, 0.001);
        self::assertEqualsWithDelta($height, $expected->heightMm, 0.001);
    }

    #[Test]
    public function an_edition_without_cards_cannot_print_cards(): void
    {
        $this->expectException(PrintFailed::class);

        PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => [], 'parts' => ['deeds' => false, 'cards' => false]]));
    }

    #[Test]
    public function the_cards_follow_the_parts_that_are_switched_on(): void
    {
        $both = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => []]));
        $decks = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => [], 'parts' => ['deeds' => false]]));
        $deeds = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => [], 'parts' => ['cards' => false]]));

        self::assertSame([120, 64, 56], [$both->pages, $decks->pages, $deeds->pages]);
    }

    #[Test]
    public function the_house_rules_card_prints_with_the_cards_when_it_is_switched_on(): void
    {
        $without = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => [], 'parts' => ['houseRules' => false]]));
        $with = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => [], 'parts' => ['houseRules' => true]]));
        $only = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => [], 'parts' => ['deeds' => false, 'cards' => false, 'houseRules' => true]]));

        self::assertSame([120, 122, 2], [$without->pages, $with->pages, $only->pages]);
        self::assertContains(PrintPart::Cards, PrintEditionData::fromArray(['elements' => [], 'parts' => ['deeds' => false, 'cards' => false, 'houseRules' => true]])->enabledParts());
    }

    #[Test]
    public function a_custom_board_profile_changes_the_panels_the_box_lid_and_the_home_sheets(): void
    {
        $profile = ['id' => 'small', 'name' => 'Klein', 'outer' => 400, 'corner' => 60, 'border' => 0, 'panels' => 2, 'boxLid' => ['w' => 200, 'h' => 150]];
        $edition = PrintEditionData::fromArray(['elements' => [], 'boardProfile' => $profile]);

        $panels = PrintLayout::expect(PrintPart::Board, PrintSet::Printer, $edition);
        self::assertSame(2, $panels->pages);
        self::assertEqualsWithDelta(204.0, $panels->widthMm, 0.001);
        self::assertEqualsWithDelta(404.0, $panels->heightMm, 0.001);

        $lid = PrintLayout::expect(PrintPart::BoxLid, PrintSet::Printer, $edition);
        self::assertEqualsWithDelta(206.0, $lid->widthMm, 0.001);
        self::assertEqualsWithDelta(156.0, $lid->heightMm, 0.001);

        // The sticker sheets are computed from the profile (HomeStickerPlan), as home-stickers.ts does.
        self::assertSame(6, PrintLayout::expect(PrintPart::Board, PrintSet::Home, $edition)->pages);

        $bordered = PrintEditionData::fromArray(['elements' => [], 'boardProfile' => ['outer' => 450, 'corner' => 65, 'border' => 5, 'panels' => 4, 'boxLid' => ['w' => 200, 'h' => 150]]]);
        self::assertSame(6, PrintLayout::expect(PrintPart::Board, PrintSet::Home, $bordered)->pages);
    }
}
