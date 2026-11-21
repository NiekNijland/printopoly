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
        yield 'cards, home' => [PrintPart::Cards, PrintSet::Home, 16, 210, 297];
        yield 'money, print shop' => [PrintPart::Money, PrintSet::Printer, 15, 320, 450];
        yield 'money, home' => [PrintPart::Money, PrintSet::Home, 35, 297, 210];
        yield 'tokens' => [PrintPart::Tokens, PrintSet::Printer, 1, 297, 210];
        yield 'box lid, print shop' => [PrintPart::BoxLid, PrintSet::Printer, 1, 273, 273];
        yield 'box lid, home' => [PrintPart::BoxLid, PrintSet::Home, 1, 297, 420];
        yield 'rules booklet, print shop' => [PrintPart::RulesBooklet, PrintSet::Printer, 16, 154.5, 216];
        yield 'rules booklet, home' => [PrintPart::RulesBooklet, PrintSet::Home, 8, 297, 210];
        yield 'houses and hotels, print shop' => [PrintPart::FoldModels, PrintSet::Printer, 3, 210, 297];
        yield 'houses and hotels, home' => [PrintPart::FoldModels, PrintSet::Home, 3, 210, 297];
        yield 'dice' => [PrintPart::Dice, PrintSet::Home, 1, 210, 297];
        yield 'invitation, print shop' => [PrintPart::Invitation, PrintSet::Printer, 1, 111, 154];
        yield 'invitation, home' => [PrintPart::Invitation, PrintSet::Home, 1, 210, 297];
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
    public function the_extra_print_items_are_off_unless_the_edition_switches_them_on(): void
    {
        $plain = PrintEditionData::fromArray(['elements' => []]);
        $extras = PrintEditionData::fromArray(['elements' => [], 'parts' => ['rulesBooklet' => true, 'invitation' => true]]);

        self::assertNotContains(PrintPart::RulesBooklet, $plain->enabledParts());
        self::assertNotContains(PrintPart::Dice, $plain->enabledParts());
        self::assertContains(PrintPart::RulesBooklet, $extras->enabledParts());
        self::assertContains(PrintPart::Invitation, $extras->enabledParts());
        self::assertNotContains(PrintPart::FoldModels, $extras->enabledParts());
    }

    #[Test]
    public function every_part_has_instruction_texts_in_both_languages(): void
    {
        foreach (PrintPart::cases() as $part) {
            foreach (['nl', 'en'] as $locale) {
                self::assertFileExists(resource_path("content/{$locale}/instructies/{$part->instructionSlug()}.md"));
            }
        }
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
    public function extra_chance_and_community_chest_cards_print_with_the_cards(): void
    {
        // B135: an extra card is an element with `added`; an element without it is no card.
        $extra = [
            'card.chance.17' => ['added' => true, 'text' => 'Je wint de pubquiz.'],
            'card.chance.18' => ['added' => true],
            'card.chest.17' => ['added' => true, 'amount' => -25],
            'card.chest.18' => ['text' => 'no added flag'],
        ];
        $edition = PrintEditionData::fromArray(['elements' => $extra]);
        $off = PrintEditionData::fromArray(['elements' => $extra, 'parts' => ['cards' => false]]);

        self::assertSame(['card.chance.17', 'card.chance.18', 'card.chest.17'], $edition->extraCardKeys());
        self::assertSame(63, $edition->cardCount());
        self::assertSame(126, PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, $edition)->pages);
        // 63 cards fill 7 sheets of nine: two alignment pages and 14 sheet pages.
        self::assertSame(16, PrintLayout::expect(PrintPart::Cards, PrintSet::Home, $edition)->pages);
        self::assertSame(28, $off->cardCount());

        $full = [];
        foreach (['chance', 'chest'] as $deck) {
            for ($i = 17; $i <= 32; $i++) {
                $full["card.{$deck}.{$i}"] = ['added' => true];
            }
        }
        // 28 deeds and 64 cards: 92 cards on 11 sheets.
        self::assertSame(24, PrintLayout::expect(PrintPart::Cards, PrintSet::Home, PrintEditionData::fromArray(['elements' => $full]))->pages);
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
    public function home_cards_are_two_alignment_pages_and_a_front_and_back_page_per_sheet_of_nine(): void
    {
        $plan = static fn (array $parts): ?int => PrintLayout::expect(PrintPart::Cards, PrintSet::Home, PrintEditionData::fromArray(['elements' => [], 'parts' => $parts]))->pages;

        // 60 and 61 cards fill 7 sheets; 32 cards fill 4; 28 deeds fill 4; the house rules card alone fills 1.
        self::assertSame(
            [16, 16, 10, 10, 4],
            [$plan([]), $plan(['houseRules' => true]), $plan(['deeds' => false]), $plan(['cards' => false]), $plan(['deeds' => false, 'cards' => false, 'houseRules' => true])],
        );
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
