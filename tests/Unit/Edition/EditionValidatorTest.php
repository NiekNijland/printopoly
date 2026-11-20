<?php

declare(strict_types=1);

namespace Tests\Unit\Edition;

use App\Edition\EditionValidator;
use App\Game\StandardEdition;
use Illuminate\Validation\ValidationException;
use Override;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\MakesEditions;
use Tests\TestCase;

/**
 * The server rules mirror resources/js/lib/edition/schema.ts. These cases are
 * the ones in schema.test.ts that matter for what the server stores.
 */
final class EditionValidatorTest extends TestCase
{
    use MakesEditions;

    private EditionValidator $validator;

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $this->validator = new EditionValidator(StandardEdition::load());
    }

    #[Test]
    public function it_accepts_a_valid_edition_and_drops_unknown_fields(): void
    {
        $edition = $this->validator->edition($this->editionPayload('e1', [
            'surprise' => 'dropped',
            'elements' => [
                'space.00' => ['name' => 'Start', 'layout' => 'full'],
                'deed.28' => ['name' => 'Laatste', 'photo' => ['photoId' => 'p1', 'cx' => 0.5, 'cy' => 0, 'scale' => 1.5, 'rotation' => 90, 'grayscale' => true]],
                'card.chest.16' => ['text' => 'Tekst', 'amount' => 100.5],
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

    #[Test]
    public function it_accepts_the_money_pawn_and_layer_fields_of_the_editor(): void
    {
        $edition = $this->validator->edition($this->editionPayload('e1', [
            'elements' => [
                'note.100' => ['color' => '#A1b2C3'],
                'bank' => ['name' => 'Bank van de club'],
                'pawn.03' => ['hidden' => true],
                'board_center' => ['layers' => [
                    ['id' => 'l1', 'kind' => 'text', 'text' => 'Hoi', 'x' => 1, 'y' => 2, 'w' => 30, 'h' => 10, 'rotation' => -45],
                ]],
            ],
        ]));

        self::assertSame('#A1b2C3', $edition['elements']['note.100']['color']);
        self::assertSame('Bank van de club', $edition['elements']['bank']['name']);
        self::assertTrue($edition['elements']['pawn.03']['hidden']);
        $layers = $edition['elements']['board_center']['layers'] ?? null;
        self::assertIsArray($layers);
        $first = $layers[0] ?? null;
        self::assertIsArray($first);
        self::assertSame(-45, $first['rotation'] ?? null);
    }

    #[Test]
    public function it_accepts_a_town_per_colour_group(): void
    {
        $edition = $this->validator->edition($this->editionPayload('e1', [
            'elements' => [
                'group.brown' => ['town' => 'Zwolle'],
                'group.darkblue' => ['town' => 'Kampen'],
            ],
        ]));

        self::assertSame(['town' => 'Zwolle'], $edition['elements']['group.brown']);
        self::assertSame(['town' => 'Kampen'], $edition['elements']['group.darkblue']);
    }

    #[Test]
    public function it_accepts_the_style_of_an_edition(): void
    {
        $edition = $this->validator->edition($this->editionPayload('e1', [
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

    #[Test]
    public function it_stores_card_text_variables_as_typed(): void
    {
        // The variables are resolved where the edition is drawn, in the editor and on the print page (B131).
        $text = 'Ga naar {space:24} en pak {currency}{amount}. Onbekend: {foo} {space:99}.';
        $edition = $this->validator->edition($this->editionPayload('e1', [
            'elements' => ['card.chance.01' => ['text' => $text, 'amount' => 50]],
        ]));

        self::assertSame($text, $edition['elements']['card.chance.01']['text']);
    }

    /**
     * @return iterable<string, array{string, mixed}>
     */
    public static function invalidElements(): iterable
    {
        yield 'unknown key' => ['space.40', ['name' => 'x']];
        yield 'space with one digit' => ['space.1', ['name' => 'x']];
        yield 'deed zero' => ['deed.00', ['name' => 'x']];
        yield 'deed too high' => ['deed.29', ['name' => 'x']];
        yield 'card deck unknown' => ['card.luck.01', ['text' => 'x']];
        yield 'card too high' => ['card.chance.17', ['text' => 'x']];
        yield 'note not in the game' => ['note.3', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'pawn too high' => ['pawn.09', ['name' => 'x']];
        yield 'amount on a space' => ['space.01', ['amount' => 5]];
        yield 'text on a space' => ['space.01', ['text' => 'x']];
        yield 'name on a card' => ['card.chance.01', ['name' => 'x']];
        yield 'layers on a space' => ['space.01', ['layers' => []]];
        yield 'name too long' => ['space.01', ['name' => 'x...']];
        yield 'amount as text' => ['card.chance.01', ['amount' => '50']];
        yield 'override as list' => ['space.01', ['a', 'b']];
        yield 'override as string' => ['space.01', 'name'];
        yield 'photo cx out of range' => ['space.01', ['photo' => ['photoId' => 'p', 'cx' => 1.1, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'photo scale zero' => ['space.01', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 0, 'rotation' => 0, 'grayscale' => false]]];
        yield 'photo grayscale as number' => ['space.01', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => 1]]];
        yield 'photo without id' => ['space.01', ['photo' => ['cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'layer of unknown kind' => ['box_lid', ['layers' => [['id' => 'l', 'kind' => 'video', 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1]]]];
        yield 'note colour without hash' => ['note.100', ['color' => 'A1B2C3']];
        yield 'note colour with three digits' => ['note.100', ['color' => '#abc']];
        yield 'colour on a card' => ['card.chance.01', ['color' => '#A1B2C3']];
        yield 'hidden as text' => ['pawn.01', ['hidden' => 'yes']];
        yield 'hidden on a space' => ['space.01', ['hidden' => true]];
        yield 'photo on the bank' => ['bank', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'bank name too long' => ['bank', ['name' => 'x...']];
        yield 'layer rotation as text' => ['box_lid', ['layers' => [['id' => 'l', 'kind' => 'text', 'text' => 'x', 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1, 'rotation' => 'left']]]];
        yield 'unknown colour group' => ['group.purple', ['town' => 'Zwolle']];
        yield 'group without a name' => ['group', ['town' => 'Zwolle']];
        yield 'name on a group' => ['group.brown', ['name' => 'Zwolle']];
        yield 'photo on a group' => ['group.brown', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'town on a space' => ['space.01', ['town' => 'Zwolle']];
        yield 'town as number' => ['group.brown', ['town' => 5]];
        yield 'centre mode unknown' => ['board_center', ['centerMode' => 'sticker']];
        yield 'centre mode on the lid' => ['box_lid', ['centerMode' => 'logo']];
        yield 'centre aspect zero' => ['board_center', ['photoAspect' => 0]];
        yield 'centre aspect huge' => ['board_center', ['photoAspect' => 50]];
        yield 'centre frame as text' => ['board_center', ['photoFrame' => 'no']];
        yield 'subtitle on a space' => ['space.01', ['subtitle' => 'x']];
        yield 'colour on a space' => ['space.01', ['color' => '#955436']];
        yield 'group colour not hex' => ['group.brown', ['color' => 'brown']];
        yield 'accent with a name' => ['theme_accent', ['name' => 'x']];
        yield 'unknown accent key' => ['theme_accent.x', ['color' => '#955436']];
        yield 'unknown pattern' => ['card_back.chance', ['pattern' => 'swirl']];
        yield 'pattern on a card' => ['card.chance.01', ['pattern' => 'dots']];
        yield 'layer without box' => ['box_lid', ['layers' => [['id' => 'l', 'kind' => 'text', 'text' => 'x']]]];
    }

    #[Test]
    public function it_accepts_a_background_photo_on_the_board_centre_only(): void
    {
        $photo = ['photoId' => 'p', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition = $this->validator->edition($this->editionPayload('e1', ['elements' => ['board_center' => ['background' => $photo]]]));

        self::assertSame($photo, $edition['elements']['board_center']['background']);

        $this->expectException(ValidationException::class);

        $this->validator->edition($this->editionPayload('e1', ['elements' => ['box_lid' => ['background' => $photo]]]));
    }

    #[Test]
    public function it_accepts_the_title_options_of_the_board_centre(): void
    {
        $options = ['centerMode' => 'logo', 'subtitle' => '', 'photoAspect' => 2.5, 'photoFrame' => false];
        $edition = $this->validator->edition($this->editionPayload('e1', ['elements' => ['board_center' => $options]]));

        self::assertSame($options, $edition['elements']['board_center']);
    }

    #[Test]
    #[DataProvider('invalidElements')]
    public function it_rejects_an_invalid_element(string $key, mixed $override): void
    {
        if ($override === ['name' => 'x...']) {
            $override = ['name' => str_repeat('x', EditionValidator::MAX_NAME_LENGTH + 1)];
        }

        $this->expectException(ValidationException::class);

        $this->validator->edition($this->editionPayload('e1', ['elements' => [$key => $override]]));
    }

    #[Test]
    public function it_rejects_too_many_layers_and_too_long_texts(): void
    {
        $layer = ['id' => 'l', 'kind' => 'text', 'text' => 'x', 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1];

        $errors = [];
        self::assertNull($this->validator->tryEdition($this->editionPayload('e1', ['elements' => ['box_lid' => ['layers' => array_fill(0, 25, $layer)]]]), $errors));
        self::assertNotSame([], $errors);

        $errors = [];
        self::assertNull($this->validator->tryEdition($this->editionPayload('e1', ['elements' => ['house_rules' => ['text' => str_repeat('x', 2001)]]]), $errors));
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
    #[Test]
    #[DataProvider('invalidEditions')]
    public function it_rejects_an_invalid_edition(array $overrides): void
    {
        if (($overrides['name'] ?? null) === 'Nine hundred') {
            $overrides['name'] = str_repeat('x', 121);
        }

        $this->expectException(ValidationException::class);

        $this->validator->edition($this->editionPayload('e1', $overrides));
    }

    #[Test]
    public function it_rejects_a_missing_field_and_a_non_object(): void
    {
        $payload = $this->editionPayload();
        unset($payload['theme']);

        $errors = [];
        self::assertNull($this->validator->tryEdition($payload, $errors));
        self::assertContains('theme: is required', $errors);

        $errors = [];
        self::assertNull($this->validator->tryEdition('nope', $errors));
        self::assertSame(['edition: must be an object'], $errors);
    }

    #[Test]
    public function a_patch_keeps_null_to_remove_an_element(): void
    {
        $patch = $this->validator->patch(['baseRevision' => 3, 'elements' => ['space.01' => null, 'space.02' => ['name' => 'A']]]);

        self::assertSame(3, $patch['baseRevision']);
        $elements = $patch['elements'] ?? [];
        self::assertArrayHasKey('space.01', $elements);
        self::assertNull($elements['space.01']);
        self::assertSame(['name' => 'A'], $elements['space.02'] ?? null);
    }

    #[Test]
    public function a_patch_needs_something_to_change(): void
    {
        $this->expectException(ValidationException::class);

        $this->validator->patch(['baseRevision' => 3]);
    }

    #[Test]
    public function it_accepts_a_photo_style_where_a_photo_can_be_full(): void
    {
        $edition = $this->validator->edition($this->editionPayload('e1', [
            'elements' => [
                'space.01' => ['photoStyle' => 'full', 'layout' => 'text'],
                'deed.01' => ['photoStyle' => 'framed'],
                'card.chance.01' => ['photoStyle' => 'full'],
                'note.5' => ['photoStyle' => 'full'],
                'pawn.01' => ['photoStyle' => 'full'],
                'box_lid' => ['photoStyle' => 'full'],
            ],
        ]));

        self::assertSame(['photoStyle' => 'full'], $edition['elements']['space.01']);
        self::assertSame(['photoStyle' => 'framed'], $edition['elements']['deed.01']);
        self::assertSame(['photoStyle' => 'full'], $edition['elements']['box_lid']);
    }

    #[Test]
    public function it_rejects_an_unknown_photo_style_and_one_on_an_element_without_the_choice(): void
    {
        foreach ([['space.01', 'wide'], ['space.01', true], ['card_back.chance', 'full'], ['board_center', 'full']] as [$key, $style]) {
            $errors = [];

            self::assertNull($this->validator->tryEdition($this->editionPayload('e1', [
                'elements' => [$key => ['photoStyle' => $style]],
            ]), $errors), $key);
            self::assertNotSame([], $errors);
        }
    }
}
