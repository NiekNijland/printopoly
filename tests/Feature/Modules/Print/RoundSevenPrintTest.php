<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Support\PrintGuide;
use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\InstructionText;
use App\Modules\Print\Support\PartText;
use App\Modules\Print\Support\PrintCacheKey;
use App\Modules\Print\Support\PrintEditionReader;
use App\Modules\Print\Support\PrintLayout;
use App\Modules\Print\ValueObjects\PrintEdition;
use App\Modules\Print\ValueObjects\PrintQuantity;
use Tests\TestCase;

/**
 * Wishes of feedback round 6 on the print side: set marks when more sets are made (B242, Emma), the whole board from
 * the print shop (B243, Anouk) and invitations by number (B244, Anouk).
 */
final class RoundSevenPrintTest extends TestCase
{
    private function edition(): PrintEdition
    {
        return resolve(PrintEditionReader::class)->fromArray(['name' => 'Oak Class', 'parts' => ['money' => true], 'elements' => []]);
    }

    public function test_the_cards_and_the_money_hold_every_set_and_the_rest_stays_one_set(): void
    {
        $one = $this->edition()->forSet(PrintSet::HOME, MoneyAmount::FOUR);
        $three = $this->edition()->forSet(PrintSet::HOME, MoneyAmount::FOUR, sets: 3);

        $cards = PrintLayout::expect(PrintPart::CARDS, PrintSet::HOME, $one)->pages ?? 0;
        // The alignment test once, the sheets of cards three times.
        self::assertSame(2 + 3 * ($cards - 2), PrintLayout::expect(PrintPart::CARDS, PrintSet::HOME, $three)->pages);
        self::assertSame(3 * (PrintLayout::expect(PrintPart::MONEY, PrintSet::HOME, $one)->pages ?? 0), PrintLayout::expect(PrintPart::MONEY, PrintSet::HOME, $three)->pages);

        $shop = $this->edition()->forSet(PrintSet::PRINTER, null, sets: 2);
        self::assertSame(2 * 2 * $shop->cardCount(), PrintLayout::expect(PrintPart::CARDS, PrintSet::PRINTER, $shop)->pages);

        // Only the cards and the money change with the number of sets: a board made for one set stays current.
        self::assertSame(
            PrintCacheKey::make(PrintPart::BOARD, PrintSet::HOME, $one->onlyFor(PrintPart::BOARD), []),
            PrintCacheKey::make(PrintPart::BOARD, PrintSet::HOME, $three->onlyFor(PrintPart::BOARD), []),
        );
        self::assertNotSame(
            PrintCacheKey::make(PrintPart::CARDS, PrintSet::HOME, $one->onlyFor(PrintPart::CARDS), []),
            PrintCacheKey::make(PrintPart::CARDS, PrintSet::HOME, $three->onlyFor(PrintPart::CARDS), []),
        );
        self::assertSame(3, $three->onlyFor(PrintPart::MONEY)->toPrintPayload([])['sets']);
        self::assertSame(1, $three->onlyFor(PrintPart::TOKENS)->toPrintPayload([])['sets']);

        // The counts per set stay those of one set.
        self::assertSame(PrintQuantity::of(PrintPart::MONEY, PrintSet::HOME, $one)->count, PrintQuantity::of(PrintPart::MONEY, PrintSet::HOME, $three)->count);
    }

    public function test_the_instruction_of_more_sets_says_to_print_the_cards_once(): void
    {
        $text = resolve(InstructionText::class);
        $three = $this->edition()->forSet(PrintSet::HOME, null, sets: 3);
        $parts = resolve(PartText::class);

        $cards = $text->fill($parts->forSet($parts->markdown(PrintPart::CARDS, Locale::DUTCH), PrintSet::HOME), PrintPart::CARDS, $three, Locale::DUTCH, PrintSet::HOME, 3);
        self::assertStringContainsString('Deze PDF heeft ze alle 3 al achter elkaar', $cards);
        self::assertStringContainsString('SET 1 tot en met SET 3', $cards);
        self::assertStringContainsString('kaarten per set van 63', $cards);

        $tokens = $text->fill('# Pionnen', PrintPart::TOKENS, $three, Locale::DUTCH, PrintSet::HOME, 3);
        self::assertStringContainsString('print of bestel alles 3 keer', $tokens);

        // The invitations have their own number: no line about sets.
        $invitation = $text->fill('# Uitnodiging', PrintPart::INVITATION, $three, Locale::DUTCH, PrintSet::HOME, 3);
        self::assertSame('# Uitnodiging', $invitation);
    }

    public function test_the_print_shop_makes_the_whole_board_on_one_page(): void
    {
        $whole = $this->edition()->forSet(PrintSet::PRINTER, null, boardForm: BoardForm::WHOLE);
        $expected = PrintLayout::expect(PrintPart::BOARD, PrintSet::PRINTER, $whole);

        // 500 mm, 3 mm bleed and 6 mm for the crop marks on every side.
        self::assertSame(1, $expected->pages);
        self::assertEqualsWithDelta(518, $expected->widthMm, 0.001);
        self::assertSame('1 heel bord', PrintQuantity::of(PrintPart::BOARD, PrintSet::PRINTER, $whole)->label(Locale::DUTCH));

        // At home the board is always stickers.
        $home = $this->edition()->forSet(PrintSet::HOME, null, boardForm: BoardForm::WHOLE);
        self::assertSame(BoardForm::PANELS, $home->boardForm);

        $text = resolve(InstructionText::class);
        $parts = resolve(PartText::class);
        $markdown = $parts->forSet($parts->markdown(PrintPart::BOARD, Locale::DUTCH), PrintSet::PRINTER);
        $filled = $text->fill($markdown, PrintPart::BOARD, $whole, Locale::DUTCH, PrintSet::PRINTER);
        self::assertStringContainsString('### Een heel bord', $filled);
        self::assertStringNotContainsString('Stickers voor je eigen bord', $filled);
        self::assertStringNotContainsString('{if:', $filled);
    }

    public function test_the_invitations_follow_the_number_four_to_a_sheet_at_home(): void
    {
        $home = $this->edition()->forSet(PrintSet::HOME, null, invitations: 80);
        $quantity = PrintQuantity::of(PrintPart::INVITATION, PrintSet::HOME, $home);
        self::assertSame(20, $quantity->count);
        self::assertSame('20 vellen A4', $quantity->label(Locale::DUTCH));
        self::assertSame('80 uitnodigingen', PrintQuantity::of(PrintPart::INVITATION, PrintSet::PRINTER, $this->edition()->forSet(PrintSet::PRINTER, null, invitations: 80))->label(Locale::DUTCH));

        // The number never changes the PDF.
        self::assertSame(
            PrintCacheKey::make(PrintPart::INVITATION, PrintSet::HOME, $this->edition()->forSet(PrintSet::HOME, null)->onlyFor(PrintPart::INVITATION), []),
            PrintCacheKey::make(PrintPart::INVITATION, PrintSet::HOME, $home->onlyFor(PrintPart::INVITATION), []),
        );
    }

    public function test_the_guide_shows_both_forms_of_the_board_and_no_order_numbers(): void
    {
        $guide = resolve(PrintGuide::class)->markdown(Locale::DUTCH);

        self::assertStringContainsString('Stickers voor je eigen bord', $guide);
        self::assertStringContainsString('Een heel bord', $guide);
        self::assertStringContainsString('reclamedrukkerij', $guide);
        self::assertStringContainsString('brievenbus', $guide);
        self::assertStringContainsString('setteken', $guide);
        self::assertStringNotContainsString('{if:', $guide);
        self::assertStringNotContainsString('Print het vel', $guide);
        self::assertStringNotContainsString('{invitations}', $guide);
    }
}
