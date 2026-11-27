<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Support\EditionValidator;
use App\Modules\Editions\Support\ElementOverrideParser;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class ElementOverrideParserTest extends TestCase
{
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
        yield 'icon on a street' => ['space.01', ['icon' => ['preset' => 'train']]];
        yield 'icon that is not in the set' => ['space.05', ['icon' => ['preset' => 'top-hat']]];
        yield 'lucide icon outside the curated set' => ['space.05', ['icon' => ['preset' => 'lucide:skull-and-bones']]];
        yield 'icon preset with extra fields' => ['space.05', ['icon' => ['preset' => 'train', 'color' => '#000000']]];
        yield 'uploaded icon without a shape' => ['space.12', ['icon' => ['photo' => ['photoId' => 'p', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]]];
        yield 'icon on a deed' => ['deed.03', ['icon' => ['preset' => 'train']]];
        yield 'text on a space' => ['space.01', ['text' => 'x']];
        yield 'name on a card' => ['card.chance.01', ['name' => 'x']];
        yield 'layers on a space' => ['space.01', ['layers' => []]];
        yield 'name too long' => ['space.01', ['name' => 'x...']];
        yield 'amount as text' => ['card.chance.07', ['amount' => '50']];
        yield 'amount on a card without money' => ['card.chance.01', ['amount' => 50]];
        yield 'card amount above 20%' => ['card.chance.07', ['amount' => 61]];
        yield 'card amount below 20%' => ['card.chest.03', ['amount' => -39]];
        yield 'card amount not whole' => ['card.chest.16', ['amount' => 100.5]];
        yield 'purpose too long' => ['card.chest.03', ['purpose' => 'x...']];
        yield 'price above 20%' => ['space.01', ['amounts' => ['price' => 73]]];
        yield 'rent below 20%' => ['space.39', ['amounts' => ['rent.0' => 39]]];
        yield 'salary on a street' => ['space.01', ['amounts' => ['salary' => 200]]];
        yield 'amounts on a card space' => ['space.02', ['amounts' => ['price' => 1]]];
        yield 'amount not whole' => ['space.01', ['amounts' => ['price' => 60.5]]];
        yield 'amounts as list' => ['space.01', ['amounts' => [60]]];
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
        yield 'photo on the bank' => ['words.bank', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'bank name too long' => ['words.bank', ['name' => 'x...']];
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
        yield 'photo fit as text' => ['space.01', ['photo' => ['photoId' => 'p', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false, 'fit' => 'yes']]];
        yield 'deed photo on a tax space' => ['space.04', ['deedPhoto' => false]];
        yield 'deed photo as text' => ['space.01', ['deedPhoto' => 'off']];
        yield 'deed story too long' => ['deed.01', ['text' => str_repeat('x', 161)]];
        yield 'title offset past the edge' => ['board_center', ['titleOffset' => 1.5]];
        yield 'title too small' => ['board_center', ['titleScale' => 0.2]];
        yield 'title band on the centre' => ['board_center', ['titleBand' => false]];
        yield 'centre place unknown' => ['board_center', ['centerPlace' => 'topLeft']];
        yield 'centre place on the lid' => ['box_lid', ['centerPlace' => 'middle']];
        yield 'logo tilt as text' => ['board_center', ['logoTilt' => 'yes']];
        yield 'title hidden on the lid' => ['box_lid', ['titleHidden' => true]];
        yield 'title style unknown' => ['board_center', ['titleStyle' => 'neon']];
        yield 'title style as a number' => ['box_lid', ['titleStyle' => 1]];
        yield 'title style on a card back' => ['card_back.chance', ['titleStyle' => 'stamp']];
        yield 'board style unknown' => ['style.board', ['style' => 'neon']];
        yield 'board style as a number' => ['style.board', ['style' => 1]];
        yield 'card style unknown' => ['style.cards', ['style' => 'neon']];
        yield 'deed style unknown' => ['style.deeds', ['style' => 'neon']];
        yield 'style of an unknown part' => ['style.dice', ['style' => 'vintage']];
        yield 'style on a space' => ['space.01', ['style' => 'vintage']];
        yield 'colour on a style key' => ['style.board', ['color' => '#FFFFFF']];
        yield 'layer colour not hex' => ['box_lid', ['layers' => [['id' => 'l', 'kind' => 'text', 'text' => 'x', 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1, 'color' => 'red']]]];
        yield 'layer font unknown' => ['box_lid', ['layers' => [['id' => 'l', 'kind' => 'text', 'text' => 'x', 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1, 'font' => 'comic']]]];
    }

    #[DataProvider('invalidElements')]
    public function test_it_rejects_an_invalid_element(string $key, mixed $override): void
    {
        if ($override === ['name' => 'x...']) {
            $override = ['name' => str_repeat('x', EditionValidator::MAX_NAME_LENGTH + 1)];
        }

        if ($override === ['purpose' => 'x...']) {
            $override = ['purpose' => str_repeat('x', EditionValidator::MAX_PURPOSE_LENGTH + 1)];
        }

        $errors = [];

        self::assertNull(resolve(ElementOverrideParser::class)->parse($key, $override, $errors));
        self::assertNotSame([], $errors);
    }

    /**
     * @return iterable<string, array{string, array<string, mixed>, string}>
     */
    public static function wrongExtraCards(): iterable
    {
        yield 'past 32' => ['card.chance.33', ['added' => true], 'elements.card.chance.33: unknown element key'];
        yield 'without added' => ['card.chance.17', ['text' => 'Hoi'], 'elements.card.chance.17: an extra card needs "added": true'];
        yield 'added false' => ['card.chance.17', ['added' => false], 'elements.card.chance.17.added: must be true'];
        yield 'added on a standard card' => ['card.chance.03', ['added' => true], 'elements.card.chance.03.added: only an extra card is added'];
        yield 'amount above 500' => ['card.chest.17', ['added' => true, 'amount' => 501], 'elements.card.chest.17.amount: must be a whole amount from -500 to 500, not 0'];
        yield 'amount zero' => ['card.chest.17', ['added' => true, 'amount' => 0], 'elements.card.chest.17.amount: must be a whole amount from -500 to 500, not 0'];
        yield 'amount not whole' => ['card.chest.17', ['added' => true, 'amount' => 12.5], 'elements.card.chest.17.amount: must be a whole amount from -500 to 500, not 0'];
    }

    /**
     * @param array<string, mixed> $override
     */
    #[DataProvider('wrongExtraCards')]
    public function test_it_rejects_a_wrong_extra_card(string $key, array $override, string $message): void
    {
        $errors = [];

        self::assertNull(resolve(ElementOverrideParser::class)->parse($key, $override, $errors));
        self::assertContains($message, $errors);
    }

    public function test_it_rejects_an_unknown_photo_style_and_one_on_an_element_without_the_choice(): void
    {
        $parser = resolve(ElementOverrideParser::class);

        foreach ([['space.01', 'wide'], ['space.01', true], ['card_back.chance', 'full'], ['board_center', 'full']] as [$key, $style]) {
            $errors = [];

            self::assertNull($parser->parse($key, ['photoStyle' => $style], $errors), $key);
            self::assertNotSame([], $errors);
        }
    }

    public function test_it_keeps_the_fields_it_knows_and_skips_a_null_and_a_layout(): void
    {
        $errors = [];

        self::assertSame(
            ['name' => 'Start', 'amounts' => ['salary' => 240]],
            resolve(ElementOverrideParser::class)->parse('space.00', ['name' => 'Start', 'text' => null, 'layout' => 'full', 'amounts' => ['salary' => 240]], $errors),
        );
        self::assertSame([], $errors);
    }
}
