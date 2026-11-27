<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\InstructionText;
use App\Modules\Print\Support\PrintEditionReader;
use App\Modules\Print\ValueObjects\PrintEdition;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class InstructionTextTest extends TestCase
{
    private const string CARD_FACTS = '{cards}|{cards_all}|{per_set}|{chance}|{chest}|{chance_extra}|{chest_extra}|{chance_split}|{chest_split}|{decks}|{deeds}|{house_rules}';

    private const string WORDS = '{chance_name}|{chest_name}|{start}|{house_word}|{houses_word}|{hotel_word}|{hotels_word}';

    public function test_a_line_stays_only_when_its_condition_holds_and_an_unknown_name_is_left_alone(): void
    {
        $markdown = "# Kaarten\n{if:chance}- {chance_name}: {chance}\n{if:chance_extra}- extra kansen\n{if:!chest_extra}- geen extra fonds\n{if:!chance}- nooit\n| {if:!house_rules} | Huisregels | geen |\n| {if:house_rules} | Huisregels | 1 |\n{onbekend} {pages} {sheets}";

        $text = resolve(InstructionText::class)->fill($markdown, PrintPart::CARDS, $this->standard()->forSet(PrintSet::HOME, null), Locale::DUTCH, PrintSet::HOME);

        self::assertSame("# Kaarten\n- Kans: 16\n- geen extra fonds\n| Huisregels | geen |\n{onbekend} 16 7", $text);
    }

    public function test_the_cards_of_a_standard_edition_count_both_decks_and_the_deeds_in_the_standard_words(): void
    {
        $text = resolve(InstructionText::class)->fill(self::CARD_FACTS . "\n" . self::WORDS, PrintPart::CARDS, $this->standard()->forSet(PrintSet::PRINTER, null), Locale::DUTCH);

        self::assertSame("60|60||16|16|0|0|||32|28|0\nKans|Algemeen Fonds|Start|huisje|huisjes|hotel|hotels", $text);
    }

    public function test_extra_cards_a_house_rule_and_the_own_words_of_an_edition_are_counted_and_named(): void
    {
        $edition = $this->withOwnWords()->forSet(PrintSet::PRINTER, null, sets: 2);

        $text = resolve(InstructionText::class)->fill(self::CARD_FACTS . "\n" . self::WORDS, PrintPart::CARDS, $edition, Locale::DUTCH);

        self::assertSame(
            "64|128| per set|17|18|1|2| (16 standaard en 1 extra)| (16 standaard en 2 extra)|35|28|1\nGok|Algemeen Fonds|Begin|Hutje|Hutjes|Kasteel|Kasteel",
            $text,
        );
    }

    public function test_the_split_of_the_decks_and_the_standard_words_speak_english(): void
    {
        $text = resolve(InstructionText::class)->fill('{chance_split}|{chest_split}|{chest_name}|{houses_word}|{hotels_word}', PrintPart::CARDS, $this->withOwnWords(), Locale::ENGLISH);

        self::assertSame(' (16 standard and 1 extra)| (16 standard and 2 extra)|Community Chest|Hutjes|Kasteel', $text);
        self::assertSame('Chance|house|houses', resolve(InstructionText::class)->fill('{chance_name}|{house_word}|{houses_word}', PrintPart::CARDS, $this->standard(), Locale::ENGLISH));
    }

    public function test_with_more_sets_the_cards_say_under_the_title_that_the_pdf_holds_every_set(): void
    {
        $edition = $this->withOwnWords()->forSet(PrintSet::PRINTER, null, sets: 2);
        $text = resolve(InstructionText::class);

        self::assertSame(
            "# Kaarten\n\nJe maakt 2 sets. Deze PDF heeft ze alle 2 al achter elkaar, en de achterkant van elke kaart en elk eigendomsbewijs heeft een setteken (SET 1 tot en met SET 2), zodat de sets niet door elkaar raken. Print of bestel hem één keer: 128 kaarten, 256 pagina's.\nTekst",
            $text->fill("# Kaarten\nTekst", PrintPart::CARDS, $edition, Locale::DUTCH, PrintSet::PRINTER, 2),
        );
        self::assertStringContainsString(
            'Print or order it once: 30 pages, 120 cards.',
            $text->fill('# Cards', PrintPart::CARDS, $this->standard()->forSet(PrintSet::HOME, null, sets: 2), Locale::ENGLISH, PrintSet::HOME, 2),
        );
    }

    public function test_the_money_of_a_print_shop_set_names_its_notes_players_and_start_money(): void
    {
        $text = resolve(InstructionText::class)->fill(
            '{notes}|{notes_all}|{per_set}|{players}|{split}|{sheets}|{start_money}',
            PrintPart::MONEY,
            $this->standard()->forSet(PrintSet::PRINTER, MoneyAmount::FOUR),
            Locale::DUTCH,
        );

        self::assertSame('144|144||2 tot 4|24 × 1, 24 × 5, 24 × 10, 30 × 20, 12 × 50, 18 × 100 en 12 × 500|11|€ 1.500', $text);
    }

    public function test_the_money_of_more_home_sets_uses_the_own_currency_sign_and_says_how_many_notes_in_all(): void
    {
        $text = resolve(InstructionText::class)->fill(
            "# Money\n{notes}|{notes_all}|{per_set}|{players}|{start_money}",
            PrintPart::MONEY,
            $this->withOwnWords()->forSet(PrintSet::HOME, null, sets: 3),
            Locale::ENGLISH,
            PrintSet::HOME,
            3,
        );

        self::assertSame(
            "# Money\n\nYou are making 3 sets. This PDF already holds all 3, one after the other, and every note carries its set mark (SET 1 to SET 3), so the sets do not get mixed up. Print or order it once: 72 sheets, 432 notes.\n144|432| per set|2 to 4|ƒ1,500",
            $text,
        );
    }

    public function test_an_own_currency_sign_in_dutch_keeps_a_fixed_space_and_english_without_a_currency_pays_in_pounds(): void
    {
        $text = resolve(InstructionText::class);
        $data = PrintScenario::editionArray();
        $data['currency'] = null;
        $noCurrency = resolve(PrintEditionReader::class)->fromArray($data);

        self::assertSame("ƒ\u{00A0}1.500", $text->fill('{start_money}', PrintPart::MONEY, $this->withOwnWords(), Locale::DUTCH, PrintSet::HOME));
        self::assertSame('£1,500', $text->fill('{start_money}', PrintPart::MONEY, $noCurrency, Locale::ENGLISH, PrintSet::HOME));
        self::assertSame('€ 1.500', $text->fill('{start_money}', PrintPart::MONEY, $noCurrency, Locale::DUTCH, PrintSet::HOME));
    }

    public function test_the_board_names_its_form_panels_and_sizes_and_the_copies_in_all(): void
    {
        $facts = '{board_whole}|{board_panels}|{board_bleed}|{panels}|{panel_w}|{panel_h}|{bleed_w}|{bleed_h}|{outer}|{sheets}';
        $text = resolve(InstructionText::class);

        self::assertSame(
            "# Bord\n\nJe maakt 3 sets. De aantallen hieronder zijn voor één set, dus print of bestel alles 3 keer: samen 3 hele borden.\n1|0|506|4|248|248|254|254|500|7",
            $text->fill("# Bord\n" . $facts, PrintPart::BOARD, $this->standard()->forSet(PrintSet::PRINTER, null, sets: 3, boardForm: BoardForm::WHOLE), Locale::DUTCH, PrintSet::PRINTER, 3),
        );
        self::assertSame('0|1|506|4|248|248|254|254|500|7', $text->fill($facts, PrintPart::BOARD, $this->standard()->forSet(PrintSet::HOME, null), Locale::ENGLISH, PrintSet::HOME));
    }

    public function test_the_box_lid_says_on_how_many_sheets_it_comes_at_home(): void
    {
        $text = resolve(InstructionText::class)->fill("# Deksel\n{lid_w}|{lid_h}|{lid_sheets}|{lid_pieces}\n{if:lid_pieces}In stukken.", PrintPart::BOX_LID, $this->standard()->forSet(PrintSet::HOME, null), Locale::DUTCH, PrintSet::HOME, 2);

        self::assertSame("# Deksel\n\nJe maakt 2 sets. De aantallen hieronder zijn voor één set, dus print of bestel alles 2 keer: samen 4 vellen A4.\n267|267|2|2\nIn stukken.", $text);
    }

    public function test_the_invitation_counts_its_own_number_and_never_gets_a_line_about_sets(): void
    {
        $text = resolve(InstructionText::class)->fill("# Uitnodiging\n{invitations}|{invitation_sheets}", PrintPart::INVITATION, $this->standard()->forSet(PrintSet::HOME, null, sets: 2, invitations: 9), Locale::DUTCH, PrintSet::HOME, 2);

        self::assertSame("# Uitnodiging\n9|3", $text);
    }

    public function test_a_part_without_facts_of_its_own_still_gets_the_words_and_the_line_about_sets(): void
    {
        $text = resolve(InstructionText::class)->fill("# Pawns\n{start} {cards}", PrintPart::TOKENS, $this->standard()->forSet(PrintSet::HOME, null), Locale::ENGLISH, PrintSet::HOME, 4);

        self::assertSame("# Pawns\n\nYou are making 4 sets. The quantities below are for one set, so print or order everything 4 times: 4 sheets A4 in all.\nStart {cards}", $text);
    }

    public function test_extra_facts_win_over_the_facts_of_the_part(): void
    {
        $text = resolve(InstructionText::class)->fill('{cards} {file}', PrintPart::CARDS, $this->standard(), Locale::DUTCH, PrintSet::PRINTER, 1, ['cards' => 99, 'file' => 'zaterdagclub-02-kaarten.pdf']);

        self::assertSame('99 zaterdagclub-02-kaarten.pdf', $text);
    }

    public function test_a_size_in_millimetres_has_no_needless_decimals_and_a_comma_in_dutch(): void
    {
        self::assertSame('12,3', InstructionText::millimetres(12.25, Locale::DUTCH));
        self::assertSame('12.3', InstructionText::millimetres(12.25, Locale::ENGLISH));
        self::assertSame('500', InstructionText::millimetres(500.0, Locale::ENGLISH));
        self::assertSame('3', InstructionText::millimetres(3.04, Locale::DUTCH));
    }

    private function standard(): PrintEdition
    {
        return resolve(PrintEditionReader::class)->fromArray(PrintScenario::editionArray());
    }

    private function withOwnWords(): PrintEdition
    {
        $data = PrintScenario::editionArray();
        $elements = $data['elements'];
        self::assertIsArray($elements);
        $data['elements'] = [
            ...$elements,
            'card.chance.17' => ['added' => true, 'text' => 'Ga naar de molen'],
            'card.chest.17' => ['added' => true, 'text' => 'Feest'],
            'card.chest.18' => ['added' => true, 'text' => 'Taart'],
            'house_rules' => ['text' => 'Vrij parkeren pakt de pot'],
            'words.chance' => ['name' => 'Gok'],
            'words.house' => ['name' => 'Hutje', 'text' => 'Hutjes'],
            'words.hotel' => ['name' => 'Kasteel'],
            'space.00' => ['name' => 'Begin'],
            'words.currency' => ['text' => 'ƒ'],
        ];

        return resolve(PrintEditionReader::class)->fromArray($data);
    }
}
