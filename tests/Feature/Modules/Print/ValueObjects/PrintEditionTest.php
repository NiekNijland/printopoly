<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\ValueObjects;

use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintEditionReader;
use App\Modules\Print\ValueObjects\PrintEdition;
use Tests\TestCase;

final class PrintEditionTest extends TestCase
{
    public function test_the_parts_that_are_on_by_default_and_the_extras_that_are_off(): void
    {
        $values = static fn (array $parts): array => array_map(static fn (PrintPart $part): string => $part->value, $parts);

        self::assertSame(['board', 'cards', 'money', 'tokens', 'box_lid'], $values(resolve(PrintEditionReader::class)->fromArray(['elements' => []])->enabledParts()));
        self::assertSame(['board', 'rules_booklet', 'invitation'], $values(resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'parts' => [
            'deeds' => false, 'cards' => false, 'money' => false, 'pawns' => false, 'boxLid' => false, 'rulesBooklet' => true, 'invitation' => true,
        ]])->enabledParts()));
        self::assertSame(['board', 'cards'], $values(resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'parts' => ['cards' => false, 'money' => false, 'pawns' => false, 'boxLid' => false]])->enabledParts()));
    }

    public function test_the_cards_count_the_added_cards_and_a_house_rules_card_with_a_rule(): void
    {
        $plain = resolve(PrintEditionReader::class)->fromArray(['elements' => []]);
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => [
            'card.chest.18' => ['text' => 'Twee', 'added' => true],
            'card.chance.17' => ['text' => 'Een', 'added' => true],
            'card.chance.19' => ['text' => 'Niet toegevoegd'],
            'card.chance.03' => ['text' => 'Standaard', 'added' => true],
            'house_rules' => ['text' => '  '],
        ]]);

        self::assertSame(60, $plain->cardCount());
        self::assertSame(['card.chance.17', 'card.chest.18'], $edition->extraCardKeys());
        self::assertFalse($edition->hasHouseRules());
        self::assertSame(62, $edition->cardCount());

        $rules = resolve(PrintEditionReader::class)->fromArray(['elements' => ['house_rules' => ['text' => 'Geen geld op vrij parkeren']]]);
        self::assertTrue($rules->hasHouseRules());
        self::assertSame(61, $rules->cardCount());
    }

    public function test_the_cache_array_names_the_sets_the_form_and_the_money_only_when_they_differ_from_the_default(): void
    {
        $plain = resolve(PrintEditionReader::class)->fromArray(['name' => 'Club', 'elements' => ['space.01' => ['name' => 'A']]]);

        self::assertSame([
            'name' => 'Club', 'language' => null, 'theme' => null, 'currency' => null, 'boardProfile' => null, 'parts' => [],
            'moneyAmount' => null, 'elements' => ['space.01' => ['name' => 'A']],
        ], $plain->toCacheArray());

        $changed = $plain->forSet(PrintSet::Printer, MoneyAmount::Four, moneyLeftOut: true, sets: 3, boardForm: BoardForm::Whole)->toCacheArray();
        self::assertSame(['four', true, 3, 'whole'], [$changed['moneyAmount'], $changed['moneyLeftOut'], $changed['sets'], $changed['boardForm']]);
    }

    public function test_a_set_takes_its_amount_its_form_and_at_least_one_copy_and_invitation(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => [], 'moneyAmount' => 'eight']);

        $printer = $edition->forSet(PrintSet::Printer, null, sets: 0, boardForm: BoardForm::Whole, invitations: 0);
        self::assertSame([MoneyAmount::Eight, 1, BoardForm::Whole, 1], [$printer->moneyAmount, $printer->sets, $printer->boardForm, $printer->invitations]);

        $home = $edition->forSet(PrintSet::Home, MoneyAmount::Full, sets: 3, boardForm: BoardForm::Whole, invitations: 30);
        self::assertSame([MoneyAmount::Full, 3, BoardForm::Panels, 30], [$home->moneyAmount, $home->sets, $home->boardForm, $home->invitations]);
        self::assertSame(1, $home->oneSet()->sets);
        self::assertSame(30, $home->oneSet()->invitations);

        $default = resolve(PrintEditionReader::class)->fromArray(['elements' => []]);
        self::assertSame(MoneyAmount::Four, $default->forSet(PrintSet::Home, null)->moneyAmount);
        self::assertSame(MoneyAmount::Full, $default->moneyAmountFor(PrintSet::Printer));
        self::assertSame(MoneyAmount::Eight, $edition->moneyAmountFor(PrintSet::Home));
    }

    public function test_only_the_cards_and_the_money_carry_set_marks(): void
    {
        $marked = array_values(array_filter(PrintPart::cases(), PrintEdition::hasSetMarks(...)));

        self::assertSame([PrintPart::Cards, PrintPart::Money], $marked);
    }

    public function test_a_part_keeps_its_own_elements_the_sets_and_the_amount_it_prints(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => [
            'space.00' => ['name' => 'Start', 'text' => 'Ga', 'photoStyle' => 'full'],
            'space.01' => ['name' => 'Molenweg', 'amounts' => ['price' => 60], 'icon' => ['id' => 'star'], 'text' => 'weg'],
            'card.chance.17' => ['text' => 'Extra', 'added' => true],
            'note.5' => ['color' => '#AA3322'],
        ], 'moneyAmount' => 'eight'])->forSet(PrintSet::Printer, null, moneyLeftOut: true, sets: 2, boardForm: BoardForm::Whole);

        $calibration = $edition->onlyFor(PrintPart::Calibration);
        self::assertSame(['space.00' => ['name' => 'Start', 'photoStyle' => 'full'], 'space.01' => ['name' => 'Molenweg', 'amounts' => ['price' => 60]]], $calibration->elements);

        $booklet = $edition->onlyFor(PrintPart::RulesBooklet);
        self::assertSame([
            'card.chance.17' => ['added' => true],
            'space.00' => ['name' => 'Start'],
            'space.01' => ['name' => 'Molenweg', 'amounts' => ['price' => 60]],
        ], $booklet->elements);
        self::assertSame([MoneyAmount::Eight, true, 1, BoardForm::Panels], [$booklet->moneyAmount, $booklet->moneyLeftOut, $booklet->sets, $booklet->boardForm]);
        self::assertSame(61, $booklet->cardCount());

        $cards = $edition->onlyFor(PrintPart::Cards);
        self::assertSame(['name' => 'Molenweg', 'amounts' => ['price' => 60], 'icon' => ['id' => 'star']], $cards->elements['space.01']);
        self::assertSame([null, false, 2], [$cards->moneyAmount, $cards->moneyLeftOut, $cards->sets]);
        self::assertSame(['card.chance.17'], $cards->extraCardKeys());

        $board = $edition->onlyFor(PrintPart::Board);
        self::assertSame([null, 1, BoardForm::Whole], [$board->moneyAmount, $board->sets, $board->boardForm]);
        self::assertSame([], $board->extraCardKeys());

        $money = $edition->onlyFor(PrintPart::Money);
        self::assertSame([['note.5' => ['color' => '#AA3322']], MoneyAmount::Eight, 2], [$money->elements, $money->moneyAmount, $money->sets]);
    }
}
