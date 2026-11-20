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
        yield 'unknown layout' => ['space.01', ['layout' => 'wide']];
        yield 'amount as text' => ['card.chance.01', ['amount' => '50']];
        yield 'override as list' => ['space.01', ['a', 'b']];
        yield 'override as string' => ['space.01', 'name'];
        yield 'photo cx out of range' => ['space.01', ['photo' => ['photoId' => 'p', 'cx' => 1.1, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'photo scale zero' => ['space.01', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 0, 'rotation' => 0, 'grayscale' => false]]];
        yield 'photo grayscale as number' => ['space.01', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => 1]]];
        yield 'photo without id' => ['space.01', ['photo' => ['cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'layer of unknown kind' => ['box_lid', ['layers' => [['id' => 'l', 'kind' => 'video', 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1]]]];
        yield 'layer without box' => ['box_lid', ['layers' => [['id' => 'l', 'kind' => 'text', 'text' => 'x']]]];
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
}
