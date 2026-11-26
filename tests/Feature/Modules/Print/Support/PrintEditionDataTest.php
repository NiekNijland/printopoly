<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintEditionData;
use InvalidArgumentException;
use Tests\TestCase;

final class PrintEditionDataTest extends TestCase
{
    private const array PHOTO = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

    public function test_json_that_is_not_an_edition_is_refused(): void
    {
        foreach (['{', '"text"', '{"elements": 5}', '{"elements": {"space.01": 5}}'] as $json) {
            try {
                PrintEditionData::fromJson($json);
                self::fail('accepted ' . $json);
            } catch (InvalidArgumentException $invalidArgumentException) {
                self::assertNotSame('', $invalidArgumentException->getMessage());
            }
        }
    }

    public function test_the_fields_are_read_with_defaults_for_what_is_missing_or_of_the_wrong_type(): void
    {
        $edition = PrintEditionData::fromJson('{"name": 5, "elements": {}, "parts": {"money": false, "board": "yes"}, "moneyAmount": "eight"}');

        self::assertSame('', $edition->name);
        self::assertNull($edition->language);
        self::assertNull($edition->theme);
        self::assertNull($edition->currency);
        self::assertNull($edition->boardProfile);
        self::assertSame([], $edition->elements);
        self::assertSame(['money' => false], $edition->parts);
        self::assertSame(MoneyAmount::Eight, $edition->moneyAmount);
        self::assertSame(1, $edition->sets);
        self::assertSame(4, $edition->invitations);
        self::assertSame(BoardForm::Panels, $edition->boardForm);
        self::assertFalse($edition->targetsDeclared);
        self::assertSame(Locale::default(), $edition->locale());
        self::assertSame(Locale::English, PrintEditionData::fromArray(['language' => 'en', 'elements' => []])->locale());
    }

    public function test_the_parts_that_are_on_by_default_and_the_extras_that_are_off(): void
    {
        $values = static fn (array $parts): array => array_map(static fn (PrintPart $part): string => $part->value, $parts);

        self::assertSame(['board', 'cards', 'money', 'tokens', 'box_lid'], $values(PrintEditionData::fromArray(['elements' => []])->enabledParts()));
        self::assertSame(['board', 'rules_booklet', 'invitation'], $values(PrintEditionData::fromArray(['elements' => [], 'parts' => [
            'deeds' => false, 'cards' => false, 'money' => false, 'pawns' => false, 'boxLid' => false, 'rulesBooklet' => true, 'invitation' => true,
        ]])->enabledParts()));
        self::assertSame(['board', 'cards'], $values(PrintEditionData::fromArray(['elements' => [], 'parts' => ['cards' => false, 'money' => false, 'pawns' => false, 'boxLid' => false]])->enabledParts()));
    }

    public function test_the_cards_count_the_added_cards_and_a_house_rules_card_with_a_rule(): void
    {
        $plain = PrintEditionData::fromArray(['elements' => []]);
        $edition = PrintEditionData::fromArray(['elements' => [
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

        $rules = PrintEditionData::fromArray(['elements' => ['house_rules' => ['text' => 'Geen geld op vrij parkeren']]]);
        self::assertTrue($rules->hasHouseRules());
        self::assertSame(61, $rules->cardCount());
    }

    public function test_the_board_profile_is_the_editions_own_or_the_configured_default(): void
    {
        self::assertSame(
            ['outer' => 500.0, 'corner' => 70.0, 'border' => 0.0, 'panels' => 4, 'boxLidWidth' => 267.0, 'boxLidHeight' => 267.0],
            PrintEditionData::fromArray(['elements' => []])->profile(),
        );
        self::assertSame(
            ['outer' => 450.0, 'corner' => 70.0, 'border' => 5.0, 'panels' => 2, 'boxLidWidth' => 200.0, 'boxLidHeight' => 267.0],
            PrintEditionData::fromArray(['elements' => [], 'boardProfile' => ['outer' => 450, 'corner' => 'wide', 'border' => 5, 'panels' => 2, 'boxLid' => ['w' => 200]]])->profile(),
        );
        self::assertSame(4, PrintEditionData::fromArray(['elements' => [], 'boardProfile' => ['panels' => 3]])->profile()['panels']);
    }

    public function test_the_placements_are_the_photos_the_icons_and_the_photo_layers_in_key_order(): void
    {
        $edition = PrintEditionData::fromArray(['elements' => [
            'space.05' => ['photo' => self::PHOTO, 'layers' => [
                ['id' => 'l1', 'kind' => 'photo', 'photo' => self::PHOTO],
                ['id' => 'l2', 'kind' => 'text', 'photo' => self::PHOTO],
                'not a layer',
            ]],
            'space.02' => ['icon' => ['photo' => self::PHOTO]],
            'board_center' => ['background' => self::PHOTO, 'photo' => 'not a photo'],
        ]]);

        $keys = array_map(static fn ($placement): string => $placement->key, $edition->placements());

        self::assertSame(['board_center#background', 'deed.03#photo', 'space.02#icon', 'space.05#photo', 'space.05#layer:l1'], $keys);
    }

    public function test_the_print_payload_carries_the_photo_sources_and_the_money_left_out(): void
    {
        $edition = PrintEditionData::fromArray(['name' => 'Club', 'language' => 'nl', 'theme' => 'classic', 'currency' => 'eur', 'parts' => ['money' => true], 'elements' => [
            'space.02' => ['icon' => ['id' => 'star', 'photo' => self::PHOTO]],
            'space.05' => ['photo' => self::PHOTO, 'layers' => [['id' => 'l1', 'kind' => 'photo', 'photo' => self::PHOTO]]],
        ]])->forSet(PrintSet::Home, null, moneyLeftOut: true, sets: 2);

        $payload = $edition->toPrintPayload(['space.02#icon' => 'icon.jpg', 'space.05#photo' => 'photo.jpg', 'space.05#layer:l1' => 'layer.jpg']);
        $elements = (array) $payload['elements'];

        self::assertSame(['name', 'language', 'theme', 'currency', 'boardProfile', 'parts', 'moneyAmount', 'sets', 'boardForm', 'elements'], array_keys($payload));
        self::assertEquals((object) ['money' => false], $payload['parts']);
        self::assertSame(['four', 2, 'panels'], [$payload['moneyAmount'], $payload['sets'], $payload['boardForm']]);
        self::assertSame(['icon' => ['id' => 'star', 'photo' => [...self::PHOTO, 'src' => 'icon.jpg']]], $elements['space.02']);
        self::assertSame([
            'photo' => [...self::PHOTO, 'src' => 'photo.jpg'],
            'layers' => [['id' => 'l1', 'kind' => 'photo', 'photo' => [...self::PHOTO, 'src' => 'layer.jpg']]],
        ], $elements['space.05']);
    }

    public function test_the_cache_array_names_the_sets_the_form_and_the_money_only_when_they_differ_from_the_default(): void
    {
        $plain = PrintEditionData::fromArray(['name' => 'Club', 'elements' => ['space.01' => ['name' => 'A']]]);

        self::assertSame([
            'name' => 'Club', 'language' => null, 'theme' => null, 'currency' => null, 'boardProfile' => null, 'parts' => [],
            'moneyAmount' => null, 'elements' => ['space.01' => ['name' => 'A']],
        ], $plain->toCacheArray());

        $changed = $plain->forSet(PrintSet::Printer, MoneyAmount::Four, moneyLeftOut: true, sets: 3, boardForm: BoardForm::Whole)->toCacheArray();
        self::assertSame(['four', true, 3, 'whole'], [$changed['moneyAmount'], $changed['moneyLeftOut'], $changed['sets'], $changed['boardForm']]);
    }

    public function test_a_set_takes_its_amount_its_form_and_at_least_one_copy_and_invitation(): void
    {
        $edition = PrintEditionData::fromArray(['elements' => [], 'moneyAmount' => 'eight']);

        $printer = $edition->forSet(PrintSet::Printer, null, sets: 0, boardForm: BoardForm::Whole, invitations: 0);
        self::assertSame([MoneyAmount::Eight, 1, BoardForm::Whole, 1], [$printer->moneyAmount, $printer->sets, $printer->boardForm, $printer->invitations]);

        $home = $edition->forSet(PrintSet::Home, MoneyAmount::Full, sets: 3, boardForm: BoardForm::Whole, invitations: 30);
        self::assertSame([MoneyAmount::Full, 3, BoardForm::Panels, 30], [$home->moneyAmount, $home->sets, $home->boardForm, $home->invitations]);
        self::assertSame(1, $home->oneSet()->sets);
        self::assertSame(30, $home->oneSet()->invitations);

        $default = PrintEditionData::fromArray(['elements' => []]);
        self::assertSame(MoneyAmount::Four, $default->forSet(PrintSet::Home, null)->moneyAmount);
        self::assertSame(MoneyAmount::Full, $default->moneyAmountFor(PrintSet::Printer));
        self::assertSame(MoneyAmount::Eight, $edition->moneyAmountFor(PrintSet::Home));
    }

    public function test_only_the_cards_and_the_money_carry_set_marks(): void
    {
        $marked = array_values(array_filter(PrintPart::cases(), PrintEditionData::hasSetMarks(...)));

        self::assertSame([PrintPart::Cards, PrintPart::Money], $marked);
    }

    public function test_a_part_keeps_its_own_elements_the_sets_and_the_amount_it_prints(): void
    {
        $edition = PrintEditionData::fromArray(['elements' => [
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

    public function test_a_target_out_of_range_is_dropped_from_the_placement(): void
    {
        $edition = PrintEditionData::fromArray(['elements' => [
            'space.01' => ['photo' => [...self::PHOTO, 'target' => ['w' => 1, 'h' => 1]]],
            'space.02' => ['icon' => ['id' => 'star', 'photo' => self::PHOTO]],
        ]])->withTargets(['space.01#photo' => ['w' => 2001, 'h' => 10], 'space.02#icon' => ['w' => 20, 'h' => 20]]);

        self::assertTrue($edition->targetsDeclared);
        self::assertSame(self::PHOTO, $edition->elements['space.01']['photo']);
        self::assertSame(['id' => 'star', 'photo' => [...self::PHOTO, 'target' => ['w' => 20.0, 'h' => 20.0]]], $edition->elements['space.02']['icon']);
        self::assertSame(['space.02#icon'], array_map(static fn ($placement): string => $placement->key, $edition->placements()));
    }
}
