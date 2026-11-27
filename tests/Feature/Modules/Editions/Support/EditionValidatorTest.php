<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Enums\ElementKind;
use App\Modules\Editions\Support\EditionValidator;
use App\Modules\Editions\Support\StandardEdition;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\Editions;
use Tests\TestCase;

/**
 * The server rules mirror resources/js/lib/render/edition-schema.ts. These cases are
 * the ones in schema.test.ts that matter for what the server stores.
 */
final class EditionValidatorTest extends TestCase
{
    public function test_it_accepts_a_valid_edition_and_drops_unknown_fields(): void
    {
        $validator = resolve(EditionValidator::class);

        $edition = $validator->edition(Editions::payload('e1', [
            'surprise' => 'dropped',
            'elements' => [
                'space.00' => ['name' => 'Start', 'layout' => 'full'],
                'deed.28' => ['name' => 'Laatste', 'photo' => ['photoId' => 'p1', 'cx' => 0.5, 'cy' => 0, 'scale' => 1.5, 'rotation' => 90, 'grayscale' => true]],
                'card.chest.16' => ['text' => 'Tekst', 'amount' => 110],
                'note.500' => ['photo' => ['photoId' => 'p2', 'cx' => 1, 'cy' => 1, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]],
                'pawn.08' => ['name' => 'Hoed'],
                'card_back.deed' => ['layers' => [
                    ['id' => 'l1', 'kind' => 'text', 'text' => 'Hallo', 'x' => 0, 'y' => 0, 'w' => 10, 'h' => 5],
                    ['id' => 'l2', 'kind' => 'photo', 'x' => 1, 'y' => 1, 'w' => 4, 'h' => 4, 'photo' => ['photoId' => 'p3', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]],
                ]],
                'box_lid' => ['name' => 'Doos'],
                'board_center' => ['name' => 'Midden'],
                'house_rules' => ['text' => 'Regels'],
            ],
        ]));

        self::assertArrayNotHasKey('surprise', $edition);
        self::assertCount(9, $edition['elements']);
        // An old layout is accepted and ignored (B122).
        self::assertSame(['name' => 'Start'], $edition['elements']['space.00']);
    }

    public function test_it_opens_an_old_edition_with_dice_and_houses_and_hotels_and_drops_them(): void
    {
        $validator = resolve(EditionValidator::class);

        // B200: the parts and their elements are gone; an edition that still has them is read, not rejected.
        $edition = $validator->edition(Editions::payload('e1', [
            'parts' => ['board' => true, 'deeds' => true, 'cards' => true, 'money' => false, 'pawns' => false, 'boxLid' => false, 'houseRules' => false, 'dice' => true, 'foldModels' => true],
            'elements' => [
                'dice' => ['photo' => ['photoId' => 'p1', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]],
                'fold_models' => [],
                'house_rules' => ['text' => 'Regels'],
            ],
        ]));

        self::assertArrayNotHasKey('dice', $edition['parts']);
        self::assertArrayNotHasKey('foldModels', $edition['parts']);
        self::assertSame(['house_rules'], array_keys($edition['elements']));
        self::assertNotInstanceOf(ElementKind::class, ElementKind::fromKey('dice', StandardEdition::load()));
    }

    public function test_it_keeps_the_amount_of_play_money_and_patches_it_back_to_the_default(): void
    {
        $validator = resolve(EditionValidator::class);

        // B156: how much money to print is a setting of the edition; null in a patch goes back to the default.
        $edition = $validator->edition(Editions::payload('e1', ['moneyAmount' => 'eight']));
        self::assertSame('eight', $edition['moneyAmount'] ?? null);

        self::assertArrayNotHasKey('moneyAmount', $validator->edition(Editions::payload('e1')));
        self::assertSame(['baseRevision' => 1, 'moneyAmount' => null], $validator->patch(['baseRevision' => 1, 'moneyAmount' => null]));

        $this->expectException(ValidationException::class);
        $validator->patch(['baseRevision' => 1, 'moneyAmount' => 'lots']);
    }

    public function test_it_accepts_the_money_pawn_and_layer_fields_of_the_editor(): void
    {
        $validator = resolve(EditionValidator::class);

        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'note.100' => ['color' => '#A1b2C3'],
                'words.bank' => ['name' => 'Bank van de club'],
                'pawn.03' => ['hidden' => true],
                'board_center' => ['layers' => [
                    ['id' => 'l1', 'kind' => 'text', 'text' => 'Hoi', 'x' => 1, 'y' => 2, 'w' => 30, 'h' => 10, 'rotation' => -45],
                ]],
            ],
        ]));

        self::assertSame('#A1b2C3', $edition['elements']['note.100']['color']);
        self::assertSame('Bank van de club', $edition['elements']['words.bank']['name']);
        self::assertTrue($edition['elements']['pawn.03']['hidden']);
        $layers = $edition['elements']['board_center']['layers'] ?? null;
        self::assertIsArray($layers);
        $first = $layers[0] ?? null;
        self::assertIsArray($first);
        self::assertSame(-45, $first['rotation'] ?? null);
    }

    public function test_it_accepts_a_town_per_colour_group(): void
    {
        $validator = resolve(EditionValidator::class);

        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'group.brown' => ['town' => 'Zwolle'],
                'group.darkblue' => ['town' => 'Kampen'],
            ],
        ]));

        self::assertSame(['town' => 'Zwolle'], $edition['elements']['group.brown']);
        self::assertSame(['town' => 'Kampen'], $edition['elements']['group.darkblue']);
    }

    public function test_it_accepts_the_style_of_an_edition(): void
    {
        $validator = resolve(EditionValidator::class);

        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'group.brown' => ['town' => 'Zwolle', 'color' => '#955436'],
                'theme_accent' => ['color' => '#E6007E'],
                'card_back.chance' => ['pattern' => 'dots'],
            ],
        ]));

        self::assertSame(['town' => 'Zwolle', 'color' => '#955436'], $edition['elements']['group.brown']);
        self::assertSame(['color' => '#E6007E'], $edition['elements']['theme_accent']);
        self::assertSame(['pattern' => 'dots'], $edition['elements']['card_back.chance']);
    }

    public function test_it_stores_card_text_variables_as_typed(): void
    {
        $validator = resolve(EditionValidator::class);

        // The variables are resolved where the edition is drawn, in the editor and on the print page (B131).
        $text = 'Ga naar {space:24} en pak {currency}{amount}. Onbekend: {foo} {space:99}.';
        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => ['card.chance.07' => ['text' => $text, 'amount' => 55]],
        ]));

        self::assertSame($text, $edition['elements']['card.chance.07']['text']);
    }

    public function test_it_accepts_amounts_within_twenty_percent_and_a_purpose(): void
    {
        $validator = resolve(EditionValidator::class);

        // B132: every amount moves at most 20% from the standard amount, rounded to a whole amount.
        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'space.00' => ['amounts' => ['salary' => 240]],
                'space.01' => ['amounts' => ['price' => 48, 'rent.5' => 300, 'houseCost' => 60, 'mortgage' => 24]],
                'space.04' => ['amounts' => ['amount' => 160]],
                'space.05' => ['amounts' => ['rent.3' => 240]],
                'space.12' => ['amounts' => ['price' => 180]],
                'card.chest.03' => ['amount' => -60, 'purpose' => 'je tandarts'],
                'card.chest.04' => ['amount' => 0],
                // R5-11: a card that paid may receive instead, within the same range.
                'card.chest.11' => ['amount' => 100],
            ],
        ]));

        self::assertSame(['price' => 48, 'rent.5' => 300, 'houseCost' => 60, 'mortgage' => 24], $edition['elements']['space.01']['amounts']);
        self::assertSame(['amount' => -60, 'purpose' => 'je tandarts'], $edition['elements']['card.chest.03']);
        self::assertSame(['amount' => 0], $edition['elements']['card.chest.04']);
        self::assertSame(['amount' => 100], $edition['elements']['card.chest.11']);
    }

    public function test_it_accepts_custom_amounts_and_an_icon_on_the_same_space(): void
    {
        $validator = resolve(EditionValidator::class);

        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'space.05' => ['amounts' => ['rent.3' => 240], 'icon' => ['preset' => 'ferry']],
                'space.04' => ['amounts' => ['amount' => 160], 'icon' => ['preset' => 'piggy-bank']],
            ],
        ]));

        self::assertSame(['amounts' => ['rent.3' => 240], 'icon' => ['preset' => 'ferry']], $edition['elements']['space.05']);
        self::assertSame(['amounts' => ['amount' => 160], 'icon' => ['preset' => 'piggy-bank']], $edition['elements']['space.04']);
    }

    public function test_it_accepts_an_icon_from_the_lucide_set_and_keeps_the_own_icons_working(): void
    {
        $validator = resolve(EditionValidator::class);

        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'space.05' => ['icon' => ['preset' => 'lucide:ship']],
                'space.12' => ['icon' => ['preset' => 'lucide:zap']],
                'space.15' => ['icon' => ['preset' => 'tram']],
            ],
        ]));

        self::assertSame(['icon' => ['preset' => 'lucide:ship']], $edition['elements']['space.05']);
        self::assertSame(['icon' => ['preset' => 'lucide:zap']], $edition['elements']['space.12']);
        self::assertSame(['icon' => ['preset' => 'tram']], $edition['elements']['space.15']);
        self::assertContains('lucide:train-front', ElementKind::lucideSpaceIcons());
        self::assertGreaterThan(200, count(ElementKind::lucideSpaceIcons()));
    }

    public function test_it_rejects_too_many_layers_and_too_long_texts(): void
    {
        $validator = resolve(EditionValidator::class);

        $layer = ['id' => 'l', 'kind' => 'text', 'text' => 'x', 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1];

        $errors = [];
        self::assertNull($validator->tryEdition(Editions::payload('e1', ['elements' => ['box_lid' => ['layers' => array_fill(0, 25, $layer)]]]), $errors));
        self::assertNotSame([], $errors);

        $errors = [];
        self::assertNull($validator->tryEdition(Editions::payload('e1', ['elements' => ['house_rules' => ['text' => str_repeat('x', 2001)]]]), $errors));
        self::assertNotSame([], $errors);
    }

    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function invalidEditions(): iterable
    {
        yield 'wrong schema version' => [['schemaVersion' => 2]];
        yield 'id with a slash' => [['id' => 'a/b']];
        yield 'empty id' => [['id' => '']];
        yield 'unknown language' => [['language' => 'de']];
        yield 'unknown currency' => [['currency' => 'doubloon']];
        yield 'unknown theme' => [['theme' => 'neon']];
        yield 'negative revision' => [['revision' => -1]];
        yield 'fractional revision' => [['revision' => 1.5]];
        yield 'created at as text' => [['createdAt' => 'yesterday']];
        yield 'name too long' => [['name' => 'Nine hundred']];
        yield 'elements as list' => [['elements' => [['name' => 'x']]]];
        yield 'board turned off' => [['parts' => ['board' => false, 'deeds' => true, 'cards' => true, 'money' => false, 'pawns' => false, 'boxLid' => false, 'houseRules' => false]]];
        yield 'part missing' => [['parts' => ['board' => true]]];
        yield 'three panels' => [['boardProfile' => ['id' => 'x', 'name' => 'x', 'outer' => 500, 'corner' => 70, 'border' => 0, 'panels' => 3, 'boxLid' => ['w' => 1, 'h' => 1]]]];
        yield 'border eats the board' => [['boardProfile' => ['id' => 'x', 'name' => 'x', 'outer' => 500, 'corner' => 70, 'border' => 250, 'panels' => 4, 'boxLid' => ['w' => 1, 'h' => 1]]]];
        yield 'corners too big' => [['boardProfile' => ['id' => 'x', 'name' => 'x', 'outer' => 500, 'corner' => 200, 'border' => 0, 'panels' => 4, 'boxLid' => ['w' => 1, 'h' => 1]]]];
        yield 'negative border' => [['boardProfile' => ['id' => 'x', 'name' => 'x', 'outer' => 500, 'corner' => 70, 'border' => -1, 'panels' => 4, 'boxLid' => ['w' => 1, 'h' => 1]]]];
        yield 'box lid without size' => [['boardProfile' => ['id' => 'x', 'name' => 'x', 'outer' => 500, 'corner' => 70, 'border' => 0, 'panels' => 4, 'boxLid' => ['w' => 0, 'h' => 1]]]];
    }

    /**
     * @param array<string, mixed> $overrides
     */
    #[DataProvider('invalidEditions')]
    public function test_it_rejects_an_invalid_edition(array $overrides): void
    {
        $validator = resolve(EditionValidator::class);

        if (($overrides['name'] ?? null) === 'Nine hundred') {
            $overrides['name'] = str_repeat('x', 121);
        }

        $this->expectException(ValidationException::class);

        $validator->edition(Editions::payload('e1', $overrides));
    }

    public function test_it_rejects_a_missing_field_and_a_non_object(): void
    {
        $validator = resolve(EditionValidator::class);

        $payload = Editions::payload();
        unset($payload['theme']);

        $errors = [];
        self::assertNull($validator->tryEdition($payload, $errors));
        self::assertContains('theme: is required', $errors);

        $errors = [];
        self::assertNull($validator->tryEdition('nope', $errors));
        self::assertSame(['edition: must be an object'], $errors);
    }

    public function test_a_patch_keeps_null_to_remove_an_element(): void
    {
        $validator = resolve(EditionValidator::class);

        $patch = $validator->patch(['baseRevision' => 3, 'elements' => ['space.01' => null, 'space.02' => ['name' => 'A']]]);

        self::assertSame(3, $patch['baseRevision']);
        $elements = $patch['elements'] ?? [];
        self::assertArrayHasKey('space.01', $elements);
        self::assertNull($elements['space.01']);
        self::assertSame(['name' => 'A'], $elements['space.02'] ?? null);
    }

    public function test_a_patch_needs_something_to_change(): void
    {
        $validator = resolve(EditionValidator::class);

        $this->expectException(ValidationException::class);

        $validator->patch(['baseRevision' => 3]);
    }

    public function test_it_accepts_extra_cards_up_to_thirty_two_per_deck(): void
    {
        $validator = resolve(EditionValidator::class);

        // B135: card.chance.17 to card.chance.32 are extra cards with added: true and a free amount up to 500.
        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'card.chance.17' => ['added' => true, 'text' => 'Je wint de pubquiz.', 'amount' => 75, 'purpose' => 'de pot'],
                'card.chest.32' => ['added' => true, 'amount' => -500],
            ],
        ]));

        self::assertSame(['added' => true, 'text' => 'Je wint de pubquiz.', 'amount' => 75, 'purpose' => 'de pot'], $edition['elements']['card.chance.17']);
        self::assertSame(['added' => true, 'amount' => -500], $edition['elements']['card.chest.32']);

        $patch = $validator->patch(['baseRevision' => 1, 'elements' => ['card.chance.18' => null]]);
        self::assertArrayHasKey('card.chance.18', $patch['elements'] ?? []);
    }
}
