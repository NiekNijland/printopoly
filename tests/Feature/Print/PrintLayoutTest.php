<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\MoneyAmount;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Modules\Editions\Support\StandardEdition;
use App\Print\PrintEditionData;
use App\Print\PrintLayout;
use PHPUnit\Framework\Attributes\DataProvider;
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
        // Print-shop pages with bleed have 6 mm around the bleed for the crop marks (B160).
        yield 'board, print shop' => [PrintPart::Board, PrintSet::Printer, 4, 266, 266];
        yield 'board, home' => [PrintPart::Board, PrintSet::Home, 7, 210, 297];
        yield 'cards, print shop' => [PrintPart::Cards, PrintSet::Printer, 120, 81, 106];
        yield 'cards, home' => [PrintPart::Cards, PrintSet::Home, 16, 210, 297];
        // The full bank at the print shop (306 notes), 2 to 4 players at home (144 notes, B156).
        yield 'money, print shop' => [PrintPart::Money, PrintSet::Printer, 22, 320, 450];
        yield 'money, home' => [PrintPart::Money, PrintSet::Home, 24, 297, 210];
        yield 'tokens' => [PrintPart::Tokens, PrintSet::Printer, 1, 297, 210];
        yield 'box lid, print shop' => [PrintPart::BoxLid, PrintSet::Printer, 1, 285, 285];
        yield 'box lid, home' => [PrintPart::BoxLid, PrintSet::Home, 2, 210, 297];
        yield 'rules booklet, print shop' => [PrintPart::RulesBooklet, PrintSet::Printer, 16, 166.0, 228];
        yield 'rules booklet, home' => [PrintPart::RulesBooklet, PrintSet::Home, 8, 297, 210];
        yield 'invitation, print shop' => [PrintPart::Invitation, PrintSet::Printer, 1, 123, 166];
        yield 'invitation, home' => [PrintPart::Invitation, PrintSet::Home, 1, 210, 297];
        yield 'test sheet' => [PrintPart::Calibration, PrintSet::Home, 1, 210, 297];
    }

    #[DataProvider('plans')]
    public function test_it_plans_pages_and_sheet_size(PrintPart $part, PrintSet $set, int $pages, float $width, float $height): void
    {
        $expected = PrintLayout::expect($part, $set, PrintEditionData::fromArray(['elements' => []]));

        self::assertSame($pages, $expected->pages);
        self::assertEqualsWithDelta($width, $expected->widthMm, 0.001);
        self::assertEqualsWithDelta($height, $expected->heightMm, 0.001);
    }

    public function test_the_extra_print_items_are_off_unless_the_edition_switches_them_on(): void
    {
        $plain = PrintEditionData::fromArray(['elements' => []]);
        $extras = PrintEditionData::fromArray(['elements' => [], 'parts' => ['rulesBooklet' => true, 'invitation' => true]]);

        self::assertNotContains(PrintPart::RulesBooklet, $plain->enabledParts());
        self::assertContains(PrintPart::RulesBooklet, $extras->enabledParts());
        self::assertContains(PrintPart::Invitation, $extras->enabledParts());
    }

    public function test_every_part_has_instruction_texts_in_both_languages(): void
    {
        foreach (PrintPart::cases() as $part) {
            foreach (['nl', 'en'] as $locale) {
                self::assertFileExists(resource_path("content/{$locale}/instructies/{$part->instructionSlug()}.md"));
            }
        }
    }

    public function test_the_cards_are_always_every_deed_and_card_whatever_the_old_switches_say(): void
    {
        // B198: what goes in the set is chosen on the print page; the cards part itself is whole.
        $both = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => []]));
        $old = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => [], 'parts' => ['deeds' => false, 'cards' => false]]));

        self::assertSame([120, 120], [$both->pages, $old->pages]);
    }

    public function test_extra_chance_and_community_chest_cards_print_with_the_cards(): void
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
        self::assertSame(63, $off->cardCount());

        $full = [];
        foreach (['chance', 'chest'] as $deck) {
            for ($i = 17; $i <= 32; $i++) {
                $full["card.{$deck}.{$i}"] = ['added' => true];
            }
        }

        // 28 deeds and 64 cards: 92 cards on 11 sheets.
        self::assertSame(24, PrintLayout::expect(PrintPart::Cards, PrintSet::Home, PrintEditionData::fromArray(['elements' => $full]))->pages);
    }

    public function test_the_house_rules_card_prints_with_the_cards_when_it_has_a_rule(): void
    {
        $rules = ['house_rules' => ['text' => "Geen geld onder Vrij parkeren.\nWie gooit, deelt."]];
        $without = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => [], 'parts' => ['houseRules' => true]]));
        // The old switch no longer counts (B210): a rule on the card is enough.
        $switchedOff = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => $rules, 'parts' => ['houseRules' => false]]));
        $with = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => $rules, 'parts' => ['houseRules' => true]]));
        $only = PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, PrintEditionData::fromArray(['elements' => $rules, 'parts' => ['deeds' => false, 'cards' => false, 'houseRules' => true]]));

        self::assertSame([120, 122, 122, 122], [$without->pages, $switchedOff->pages, $with->pages, $only->pages]);
        self::assertContains(PrintPart::Cards, PrintEditionData::fromArray(['elements' => $rules, 'parts' => ['deeds' => false, 'cards' => false, 'houseRules' => true]])->enabledParts());
    }

    public function test_an_empty_house_rules_card_is_left_out_of_the_set(): void
    {
        // Bug 20 of test round 3: the card was on without a rule and printed blank.
        foreach ([[], ['house_rules' => ['text' => "  \n "]]] as $elements) {
            $edition = PrintEditionData::fromArray(['elements' => $elements, 'parts' => ['houseRules' => true]]);

            self::assertFalse($edition->hasHouseRules());
            self::assertSame(60, $edition->cardCount());
            self::assertSame(120, PrintLayout::expect(PrintPart::Cards, PrintSet::Printer, $edition)->pages);
        }

        $alone = PrintEditionData::fromArray(['elements' => [], 'parts' => ['deeds' => false, 'cards' => false, 'houseRules' => true]]);
        self::assertNotContains(PrintPart::Cards, $alone->enabledParts());
    }

    public function test_the_money_follows_the_amount_chosen_for_the_set(): void
    {
        // B156: 144 notes for 2 to 4 players, 258 for 8, 306 for the full bank; 6 on A4, 14 on SRA3.
        $plain = PrintEditionData::fromArray(['elements' => []]);
        $eight = PrintEditionData::fromArray(['elements' => [], 'moneyAmount' => 'eight']);
        $sheets = static fn (PrintEditionData $edition, PrintSet $set): ?int => PrintLayout::expect(PrintPart::Money, $set, $edition->forSet($set, null))->pages;

        self::assertSame([24, 22], [$sheets($plain, PrintSet::Home), $sheets($plain, PrintSet::Printer)]);
        self::assertSame([43, 19], [$sheets($eight, PrintSet::Home), $sheets($eight, PrintSet::Printer)]);
        self::assertSame(51, PrintLayout::expect(PrintPart::Money, PrintSet::Home, $plain->forSet(PrintSet::Home, MoneyAmount::Full))->pages);
        self::assertSame([144, 258, 306], [MoneyAmount::Four->total(), MoneyAmount::Eight->total(), MoneyAmount::Full->total()]);
    }

    public function test_the_eight_player_money_covers_the_starting_split_of_eight(): void
    {
        $split = resolve(StandardEdition::class)->money()['startingCash']['split'];

        foreach ([[MoneyAmount::Four, 4], [MoneyAmount::Eight, 8], [MoneyAmount::Full, 8]] as [$amount, $players]) {
            foreach ($split as $note) {
                self::assertGreaterThanOrEqual($players * $note['count'], $amount->counts()[$note['value']] ?? 0, "{$amount->value}: {$note['value']}");
            }
        }

        // The full bank is never less than the 30 of each value of the original game.
        foreach (MoneyAmount::Full->counts() as $count) {
            self::assertGreaterThanOrEqual(30, $count);
        }
    }

    public function test_only_the_money_and_the_booklet_change_with_the_amount_of_money(): void
    {
        $four = PrintEditionData::fromArray(['elements' => []])->forSet(PrintSet::Printer, MoneyAmount::Four);
        $full = PrintEditionData::fromArray(['elements' => []])->forSet(PrintSet::Printer, MoneyAmount::Full);

        self::assertSame($four->onlyFor(PrintPart::Board)->toCacheArray(), $full->onlyFor(PrintPart::Board)->toCacheArray());
        self::assertNotSame($four->onlyFor(PrintPart::Money)->toCacheArray(), $full->onlyFor(PrintPart::Money)->toCacheArray());
        self::assertNotSame($four->onlyFor(PrintPart::RulesBooklet)->toCacheArray(), $full->onlyFor(PrintPart::RulesBooklet)->toCacheArray());
    }

    public function test_home_cards_are_two_alignment_pages_and_a_front_and_back_page_per_sheet_of_nine(): void
    {
        $rules = ['house_rules' => ['text' => 'Wie gooit, deelt.']];
        $plan = static fn (array $parts): ?int => PrintLayout::expect(PrintPart::Cards, PrintSet::Home, PrintEditionData::fromArray(['elements' => $rules, 'parts' => $parts]))->pages;

        // 60 and 61 cards fill 7 sheets, whatever the old switches of the deeds and decks say (B198).
        self::assertSame(
            [16, 16, 16, 16, 16],
            [$plan([]), $plan(['houseRules' => true]), $plan(['deeds' => false]), $plan(['cards' => false]), $plan(['deeds' => false, 'cards' => false, 'houseRules' => true])],
        );
    }

    public function test_a_custom_board_profile_changes_the_panels_the_box_lid_and_the_home_sheets(): void
    {
        $profile = ['id' => 'small', 'name' => 'Klein', 'outer' => 400, 'corner' => 60, 'border' => 0, 'panels' => 2, 'boxLid' => ['w' => 200, 'h' => 150]];
        $edition = PrintEditionData::fromArray(['elements' => [], 'boardProfile' => $profile]);

        $panels = PrintLayout::expect(PrintPart::Board, PrintSet::Printer, $edition);
        self::assertSame(2, $panels->pages);
        self::assertEqualsWithDelta(216.0, $panels->widthMm, 0.001);
        self::assertEqualsWithDelta(416.0, $panels->heightMm, 0.001);
        self::assertSame(['w' => 198.0, 'h' => 398.0], PrintLayout::panelTrim($edition->profile()));

        $lid = PrintLayout::expect(PrintPart::BoxLid, PrintSet::Printer, $edition);
        self::assertEqualsWithDelta(218.0, $lid->widthMm, 0.001);
        self::assertEqualsWithDelta(168.0, $lid->heightMm, 0.001);

        // The sticker sheets are computed from the profile (HomeStickerPlan), as home-stickers.ts does.
        self::assertSame(6, PrintLayout::expect(PrintPart::Board, PrintSet::Home, $edition)->pages);

        $bordered = PrintEditionData::fromArray(['elements' => [], 'boardProfile' => ['outer' => 450, 'corner' => 65, 'border' => 5, 'panels' => 4, 'boxLid' => ['w' => 200, 'h' => 150]]]);
        self::assertSame(6, PrintLayout::expect(PrintPart::Board, PrintSet::Home, $bordered)->pages);
    }
}
