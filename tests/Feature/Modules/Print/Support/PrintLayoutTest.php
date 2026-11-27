<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Editions\Support\StandardEdition;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\BoardProfile;
use App\Modules\Print\Support\PrintEditionReader;
use App\Modules\Print\Support\PrintLayout;
use App\Modules\Print\ValueObjects\PrintEdition;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * The page plan the PDF check expects. The same table sits in
 * resources/js/lib/render/print-composition.test.ts: change both together.
 */
final class PrintLayoutTest extends TestCase
{
    /**
     * @return iterable<string, array{PrintPart, PrintSet, int, float, float}>
     */
    public static function plans(): iterable
    {
        // Print-shop pages with bleed have 6 mm around the bleed for the crop marks (B160).
        yield 'board, print shop' => [PrintPart::BOARD, PrintSet::PRINTER, 4, 266, 266];
        yield 'board, home' => [PrintPart::BOARD, PrintSet::HOME, 7, 210, 297];
        yield 'cards, print shop' => [PrintPart::CARDS, PrintSet::PRINTER, 120, 81, 106];
        yield 'cards, home' => [PrintPart::CARDS, PrintSet::HOME, 16, 210, 297];
        // The full bank at the print shop (306 notes), 2 to 4 players at home (144 notes, B156).
        yield 'money, print shop' => [PrintPart::MONEY, PrintSet::PRINTER, 22, 320, 450];
        yield 'money, home' => [PrintPart::MONEY, PrintSet::HOME, 24, 297, 210];
        yield 'tokens' => [PrintPart::TOKENS, PrintSet::PRINTER, 1, 297, 210];
        yield 'box lid, print shop' => [PrintPart::BOX_LID, PrintSet::PRINTER, 1, 285, 285];
        yield 'box lid, home' => [PrintPart::BOX_LID, PrintSet::HOME, 2, 210, 297];
        yield 'rules booklet, print shop' => [PrintPart::RULES_BOOKLET, PrintSet::PRINTER, 16, 166.0, 228];
        yield 'rules booklet, home' => [PrintPart::RULES_BOOKLET, PrintSet::HOME, 8, 297, 210];
        yield 'invitation, print shop' => [PrintPart::INVITATION, PrintSet::PRINTER, 1, 123, 166];
        yield 'invitation, home' => [PrintPart::INVITATION, PrintSet::HOME, 1, 210, 297];
        yield 'test sheet' => [PrintPart::CALIBRATION, PrintSet::HOME, 1, 210, 297];
    }

    #[DataProvider('plans')]
    public function test_it_plans_pages_and_sheet_size(PrintPart $part, PrintSet $set, int $pages, float $width, float $height): void
    {
        $expected = PrintLayout::expect($part, $set, resolve(PrintEditionReader::class)->fromArray(['elements' => []]));

        self::assertSame($pages, $expected->pages);
        self::assertEqualsWithDelta($width, $expected->widthMm, 0.001);
        self::assertEqualsWithDelta($height, $expected->heightMm, 0.001);
    }

    public function test_the_extra_print_items_are_off_unless_the_edition_switches_them_on(): void
    {
        $plain = resolve(PrintEditionReader::class)->fromArray(['elements' => []]);
        $extras = resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'parts' => ['rulesBooklet' => true, 'invitation' => true]]);

        self::assertNotContains(PrintPart::RULES_BOOKLET, $plain->enabledParts());
        self::assertContains(PrintPart::RULES_BOOKLET, $extras->enabledParts());
        self::assertContains(PrintPart::INVITATION, $extras->enabledParts());
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
        $both = PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, resolve(PrintEditionReader::class)->fromArray(['elements' => []]));
        $old = PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'parts' => ['deeds' => false, 'cards' => false]]));

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
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => $extra]);
        $off = resolve(PrintEditionReader::class)->fromArray(['elements' => $extra, 'parts' => ['cards' => false]]);

        self::assertSame(['card.chance.17', 'card.chance.18', 'card.chest.17'], $edition->extraCardKeys());
        self::assertSame(63, $edition->cardCount());
        self::assertSame(126, PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, $edition)->pages);
        // 63 cards fill 7 sheets of nine: two alignment pages and 14 sheet pages.
        self::assertSame(16, PrintLayout::expect(PrintPart::CARDS, PrintSet::HOME, $edition)->pages);
        self::assertSame(63, $off->cardCount());

        $full = [];
        foreach (['chance', 'chest'] as $deck) {
            for ($i = 17; $i <= 32; $i++) {
                $full["card.{$deck}.{$i}"] = ['added' => true];
            }
        }

        // 28 deeds and 64 cards: 92 cards on 11 sheets.
        self::assertSame(24, PrintLayout::expect(PrintPart::CARDS, PrintSet::HOME, resolve(PrintEditionReader::class)->fromArray(['elements' => $full]))->pages);
    }

    public function test_the_house_rules_card_prints_with_the_cards_when_it_has_a_rule(): void
    {
        $rules = ['house_rules' => ['text' => "Geen geld onder Vrij parkeren.\nWie gooit, deelt."]];
        $without = PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'parts' => ['houseRules' => true]]));
        // The old switch no longer counts (B210): a rule on the card is enough.
        $switchedOff = PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, resolve(PrintEditionReader::class)->fromArray(['elements' => $rules, 'parts' => ['houseRules' => false]]));
        $with = PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, resolve(PrintEditionReader::class)->fromArray(['elements' => $rules, 'parts' => ['houseRules' => true]]));
        $only = PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, resolve(PrintEditionReader::class)->fromArray(['elements' => $rules, 'parts' => ['deeds' => false, 'cards' => false, 'houseRules' => true]]));

        self::assertSame([120, 122, 122, 122], [$without->pages, $switchedOff->pages, $with->pages, $only->pages]);
        self::assertContains(PrintPart::CARDS, resolve(PrintEditionReader::class)->fromArray(['elements' => $rules, 'parts' => ['deeds' => false, 'cards' => false, 'houseRules' => true]])->enabledParts());
    }

    public function test_an_empty_house_rules_card_is_left_out_of_the_set(): void
    {
        // Bug 20 of test round 3: the card was on without a rule and printed blank.
        foreach ([[], ['house_rules' => ['text' => "  \n "]]] as $elements) {
            $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => $elements, 'parts' => ['houseRules' => true]]);

            self::assertFalse($edition->hasHouseRules());
            self::assertSame(60, $edition->cardCount());
            self::assertSame(120, PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, $edition)->pages);
        }

        $alone = resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'parts' => ['deeds' => false, 'cards' => false, 'houseRules' => true]]);
        self::assertNotContains(PrintPart::CARDS, $alone->enabledParts());
    }

    public function test_the_money_follows_the_amount_chosen_for_the_set(): void
    {
        // B156: 144 notes for 2 to 4 players, 258 for 8, 306 for the full bank; 6 on A4, 14 on SRA3.
        $plain = resolve(PrintEditionReader::class)->fromArray(['elements' => []]);
        $eight = resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'moneyAmount' => 'eight']);
        $sheets = static fn (PrintEdition $edition, PrintSet $set): ?int => PrintLayout::expect(PrintPart::MONEY, $set, $edition->forSet($set, null))->pages;

        self::assertSame([24, 22], [$sheets($plain, PrintSet::HOME), $sheets($plain, PrintSet::PRINTER)]);
        self::assertSame([43, 19], [$sheets($eight, PrintSet::HOME), $sheets($eight, PrintSet::PRINTER)]);
        self::assertSame(51, PrintLayout::expect(PrintPart::MONEY, PrintSet::HOME, $plain->forSet(PrintSet::HOME, MoneyAmount::FULL))->pages);
        self::assertSame([144, 258, 306], [MoneyAmount::FOUR->total(), MoneyAmount::EIGHT->total(), MoneyAmount::FULL->total()]);
    }

    public function test_the_eight_player_money_covers_the_starting_split_of_eight(): void
    {
        $split = resolve(StandardEdition::class)->money()['startingCash']['split'];

        foreach ([[MoneyAmount::FOUR, 4], [MoneyAmount::EIGHT, 8], [MoneyAmount::FULL, 8]] as [$amount, $players]) {
            foreach ($split as $note) {
                self::assertGreaterThanOrEqual($players * $note['count'], $amount->counts()[$note['value']] ?? 0, "{$amount->value}: {$note['value']}");
            }
        }

        // The full bank is never less than the 30 of each value of the original game.
        foreach (MoneyAmount::FULL->counts() as $count) {
            self::assertGreaterThanOrEqual(30, $count);
        }
    }

    public function test_only_the_money_and_the_booklet_change_with_the_amount_of_money(): void
    {
        $four = resolve(PrintEditionReader::class)->fromArray(['elements' => []])->forSet(PrintSet::PRINTER, MoneyAmount::FOUR);
        $full = resolve(PrintEditionReader::class)->fromArray(['elements' => []])->forSet(PrintSet::PRINTER, MoneyAmount::FULL);

        self::assertSame($four->onlyFor(PrintPart::BOARD)->toCacheArray(), $full->onlyFor(PrintPart::BOARD)->toCacheArray());
        self::assertNotSame($four->onlyFor(PrintPart::MONEY)->toCacheArray(), $full->onlyFor(PrintPart::MONEY)->toCacheArray());
        self::assertNotSame($four->onlyFor(PrintPart::RULES_BOOKLET)->toCacheArray(), $full->onlyFor(PrintPart::RULES_BOOKLET)->toCacheArray());
    }

    public function test_home_cards_are_two_alignment_pages_and_a_front_and_back_page_per_sheet_of_nine(): void
    {
        $rules = ['house_rules' => ['text' => 'Wie gooit, deelt.']];
        $plan = static fn (array $parts): ?int => PrintLayout::expect(PrintPart::CARDS, PrintSet::HOME, resolve(PrintEditionReader::class)->fromArray(['elements' => $rules, 'parts' => $parts]))->pages;

        // 60 and 61 cards fill 7 sheets, whatever the old switches of the deeds and decks say (B198).
        self::assertSame(
            [16, 16, 16, 16, 16],
            [$plan([]), $plan(['houseRules' => true]), $plan(['deeds' => false]), $plan(['cards' => false]), $plan(['deeds' => false, 'cards' => false, 'houseRules' => true])],
        );
    }

    public function test_a_custom_board_profile_changes_the_panels_the_box_lid_and_the_home_sheets(): void
    {
        $profile = ['id' => 'small', 'name' => 'Klein', 'outer' => 400, 'corner' => 60, 'border' => 0, 'panels' => 2, 'boxLid' => ['w' => 200, 'h' => 150]];
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'boardProfile' => $profile]);

        $panels = PrintLayout::expect(PrintPart::BOARD, PrintSet::PRINTER, $edition);
        self::assertSame(2, $panels->pages);
        self::assertEqualsWithDelta(216.0, $panels->widthMm, 0.001);
        self::assertEqualsWithDelta(416.0, $panels->heightMm, 0.001);
        self::assertSame(['w' => 198.0, 'h' => 398.0], PrintLayout::panelTrim(BoardProfile::of($edition)));

        $lid = PrintLayout::expect(PrintPart::BOX_LID, PrintSet::PRINTER, $edition);
        self::assertEqualsWithDelta(218.0, $lid->widthMm, 0.001);
        self::assertEqualsWithDelta(168.0, $lid->heightMm, 0.001);

        // The sticker sheets are computed from the profile (HomeStickerPlan), as home-stickers.ts does.
        self::assertSame(6, PrintLayout::expect(PrintPart::BOARD, PrintSet::HOME, $edition)->pages);

        $bordered = resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'boardProfile' => ['outer' => 450, 'corner' => 65, 'border' => 5, 'panels' => 4, 'boxLid' => ['w' => 200, 'h' => 150]]]);
        self::assertSame(6, PrintLayout::expect(PrintPart::BOARD, PrintSet::HOME, $bordered)->pages);
    }
}
