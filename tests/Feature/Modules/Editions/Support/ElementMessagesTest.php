<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Support\EditionValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\Editions;
use Tests\TestCase;

final class ElementMessagesTest extends TestCase
{
    private const array PHOTO = ['photoId' => 'p', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

    private const array BOX = ['id' => 'l', 'x' => 0, 'y' => 0, 'w' => 1, 'h' => 1];

    /**
     * @return iterable<string, array{string, mixed, list<string>}>
     */
    public static function wrongOverrides(): iterable
    {
        yield 'unknown key' => ['space.40', ['name' => 'x'], ['elements.space.40: unknown element key']];
        yield 'not an object' => ['space.01', 'x', ['elements.space.01: override must be an object']];
        yield 'field not allowed' => ['space.01', ['town' => 'x'], ['elements.space.01.town: field is not allowed here']];
        yield 'text on a street' => ['space.01', ['text' => 'x'], ['elements.space.01.text: only a corner has a text']];
        yield 'amounts as a list' => ['space.01', ['amounts' => [1]], ['elements.space.01.amounts: must be an object']];
        yield 'amounts wrong' => ['space.01', ['amounts' => ['salary' => 1, 'price' => 60.5, 'mortgage' => 100]], [
            'elements.space.01.amounts.salary: not an amount of this space',
            'elements.space.01.amounts.price: must be a whole number',
            'elements.space.01.amounts.mortgage: must be between 24 and 36',
        ]];
        yield 'amount as text' => ['card.chance.07', ['amount' => '5'], ['elements.card.chance.07.amount: must be a number']];
        yield 'amount on a card without money' => ['card.chance.01', ['amount' => 5], ['elements.card.chance.01.amount: this card has no amount']];
        yield 'amount out of range' => ['card.chance.07', ['amount' => 61], ['elements.card.chance.07.amount: must be between 40 and 60, in the direction of the standard amount']];
        yield 'extra card amount' => ['card.chest.17', ['added' => true, 'amount' => 501], ['elements.card.chest.17.amount: must be a whole amount from -500 to 500, not 0']];
        yield 'added on a standard card' => ['card.chance.03', ['added' => true], ['elements.card.chance.03.added: only an extra card is added']];
        yield 'added false' => ['card.chance.17', ['added' => false], ['elements.card.chance.17.added: must be true']];
        yield 'extra card without added' => ['card.chance.17', ['text' => 'x'], ['elements.card.chance.17: an extra card needs "added": true']];
        yield 'deed photo on a tax space' => ['space.04', ['deedPhoto' => true], ['elements.space.04.deedPhoto: only a street, station or utility has a deed']];
        yield 'deed photo as text' => ['space.05', ['deedPhoto' => 'no'], ['elements.space.05.deedPhoto: must be a boolean']];
        yield 'icon on a street' => ['space.01', ['icon' => ['preset' => 'car']], ['elements.space.01.icon: only a special space has an icon']];
        yield 'icon as a list' => ['space.05', ['icon' => ['car']], ['elements.space.05.icon: must be an object']];
        yield 'icon preset unknown' => ['space.05', ['icon' => ['preset' => 'top-hat']], ['elements.space.05.icon: preset must be one of the built-in icons']];
        yield 'icon aspect' => ['space.05', ['icon' => ['photo' => self::PHOTO, 'aspect' => 21]], ['elements.space.05.icon: aspect must be a number between 0.05 and 20']];
        yield 'icon photo' => ['space.05', ['icon' => ['photo' => 'x', 'aspect' => 1]], ['elements.space.05.icon.photo: photo must be an object']];
        yield 'style unknown' => ['style.box_lid', ['style' => 'neon'], ['elements.style.box_lid.style: must be one of vintage, modern, playful']];
        yield 'name too long' => ['space.01', ['name' => str_repeat('x', 121)], ['elements.space.01.name: must be a string of at most 120 characters']];
        yield 'word too long' => ['words.house', ['name' => str_repeat('x', 41)], ['elements.words.house.name: must be a string of at most 40 characters']];
        yield 'bank name fits a name' => ['words.bank', ['name' => str_repeat('x', 121)], ['elements.words.bank.name: must be a string of at most 120 characters']];
        yield 'currency symbol too long' => ['words.currency', ['text' => 'xxxxxxx'], ['elements.words.currency.text: must be a string of at most 6 characters']];
        yield 'word text too long' => ['words.house', ['text' => str_repeat('x', 41)], ['elements.words.house.text: must be a string of at most 40 characters']];
        yield 'corner text too long' => ['space.10', ['text' => str_repeat('x', 121)], ['elements.space.10.text: must be a string of at most 120 characters']];
        yield 'deed story too long' => ['deed.01', ['text' => str_repeat('x', 161)], ['elements.deed.01.text: must be a string of at most 160 characters']];
        yield 'rules too long' => ['house_rules', ['text' => str_repeat('x', 2001)], ['elements.house_rules.text: must be a string of at most 2000 characters']];
        yield 'town as a number' => ['group.brown', ['town' => 5], ['elements.group.brown.town: must be a string of at most 120 characters']];
        yield 'subtitle too long' => ['box_lid', ['subtitle' => str_repeat('x', 121)], ['elements.box_lid.subtitle: must be a string of at most 120 characters']];
        yield 'purpose too long' => ['card.chance.07', ['purpose' => str_repeat('x', 61)], ['elements.card.chance.07.purpose: must be a string of at most 60 characters']];
        yield 'colour' => ['note.100', ['color' => '#abc'], ['elements.note.100.color: must be a colour like #FFFDF7']];
        yield 'pattern' => ['card_back.chance', ['pattern' => 'swirl'], ['elements.card_back.chance.pattern: must be one of the built-in patterns']];
        yield 'hidden' => ['pawn.01', ['hidden' => 1], ['elements.pawn.01.hidden: must be a boolean']];
        yield 'photo frame' => ['board_center', ['photoFrame' => 'no'], ['elements.board_center.photoFrame: must be a boolean']];
        yield 'title hidden' => ['board_center', ['titleHidden' => 'no'], ['elements.board_center.titleHidden: must be a boolean']];
        yield 'title band' => ['box_lid', ['titleBand' => 'no'], ['elements.box_lid.titleBand: must be a boolean']];
        yield 'logo tilt' => ['board_center', ['logoTilt' => 'no'], ['elements.board_center.logoTilt: must be a boolean']];
        yield 'photo style' => ['space.01', ['photoStyle' => 'wide'], ['elements.space.01.photoStyle: must be "framed" or "full"']];
        yield 'title style' => ['box_lid', ['titleStyle' => 'neon'], ['elements.box_lid.titleStyle: must be one of ribbon, stamp, bar, script, plain']];
        yield 'centre place' => ['board_center', ['centerPlace' => 'top'], ['elements.board_center.centerPlace: must be "bottomLeft" or "middle"']];
        yield 'centre mode' => ['board_center', ['centerMode' => 'video'], ['elements.board_center.centerMode: must be "name", "photo" or "logo"']];
        yield 'photo aspect' => ['board_center', ['photoAspect' => 0.01], ['elements.board_center.photoAspect: must be a number between 0.05 and 20']];
        yield 'title offset' => ['board_center', ['titleOffset' => -1.5], ['elements.board_center.titleOffset: must be a number from -1 to 1']];
        yield 'title scale' => ['board_center', ['titleScale' => 1.1], ['elements.board_center.titleScale: must be a number from 0.5 to 1']];
        yield 'photo as a list' => ['space.01', ['photo' => [1]], ['elements.space.01.photo: photo must be an object']];
        yield 'photo all wrong' => ['board_center', ['background' => ['photoId' => '', 'cx' => 2, 'cy' => 0, 'scale' => 0, 'rotation' => 'x', 'grayscale' => 0, 'fit' => 'x']], [
            'elements.board_center.background: fit must be a boolean',
            'elements.board_center.background: photoId must be a non-empty string',
            'elements.board_center.background: cx and cy must be between 0 and 1',
            'elements.board_center.background: scale must be greater than 0',
            'elements.board_center.background: rotation must be a number',
            'elements.board_center.background: grayscale must be a boolean',
        ]];
        yield 'photo id too long' => ['space.01', ['photo' => [...self::PHOTO, 'photoId' => str_repeat('p', 129)]], ['elements.space.01.photo: photoId must be a non-empty string']];
        yield 'photo cy too low' => ['space.01', ['photo' => [...self::PHOTO, 'cy' => -0.1]], ['elements.space.01.photo: cx and cy must be between 0 and 1']];
        yield 'layers not a list' => ['box_lid', ['layers' => ['a' => 1]], ['elements.box_lid.layers: must be a list of at most 24 layers']];
        yield 'too many layers' => ['box_lid', ['layers' => array_fill(0, 25, [])], ['elements.box_lid.layers: must be a list of at most 24 layers']];
        yield 'layers wrong' => ['card_back.deed', ['layers' => [
            'x',
            ['id' => ''],
            ['id' => 'l', 'x' => 0, 'y' => 0, 'w' => 1],
            [...self::BOX, 'rotation' => 'x'],
            [...self::BOX, 'kind' => 'text', 'text' => str_repeat('x', 2001)],
            [...self::BOX, 'kind' => 'text', 'text' => 'x', 'align' => 'justify'],
            [...self::BOX, 'kind' => 'photo', 'photo' => null],
            [...self::BOX, 'kind' => 'video'],
        ]], [
            'elements.card_back.deed.layers[0]: layer must be an object',
            'elements.card_back.deed.layers[1]: id must be a non-empty string',
            'elements.card_back.deed.layers[2]: x, y, w and h must be numbers',
            'elements.card_back.deed.layers[3]: rotation must be a number',
            'elements.card_back.deed.layers[4]: text must be a string of at most 2000 characters',
            'elements.card_back.deed.layers[5]: color must be like #FFFDF7, font heading, body or mono, align left, center or right',
            'elements.card_back.deed.layers[6].photo: photo must be an object',
            'elements.card_back.deed.layers[7]: kind must be "text" or "photo"',
        ]];
    }

    /**
     * @param list<string> $messages
     */
    #[DataProvider('wrongOverrides')]
    public function test_a_wrong_override_names_what_is_wrong(string $key, mixed $override, array $messages): void
    {
        $errors = [];

        self::assertNull(resolve(EditionValidator::class)->tryEdition(Editions::payload('e1', ['elements' => [$key => $override]]), $errors));
        self::assertSame($messages, $errors);
    }

    /**
     * @return iterable<string, array{0: string, 1: array<string, mixed>, 2?: array<string, mixed>}>
     */
    public static function validOverrides(): iterable
    {
        yield 'nulls and a layout are skipped' => ['space.01', ['name' => null, 'layout' => 'full', 'text' => null], []];
        yield 'whole floats become ints' => ['space.01', ['amounts' => ['price' => 50.0]], ['amounts' => ['price' => 50]]];
        yield 'a corner text' => ['space.20', ['text' => 'Vrij parkeren']];
        yield 'a deed photo' => ['space.12', ['deedPhoto' => false]];
        yield 'an uploaded icon' => ['space.05', ['icon' => ['photo' => [...self::PHOTO, 'fit' => true], 'aspect' => 0.05]]];
        yield 'an amount of zero' => ['card.chance.07', ['amount' => 0]];
        yield 'an extra card' => ['card.chest.20', ['added' => true, 'amount' => -1.0]];
        yield 'photo fit false is dropped' => ['space.01', ['photo' => [...self::PHOTO, 'fit' => false]], ['photo' => self::PHOTO]];
        yield 'layers in full' => ['box_lid', ['layers' => [
            [...self::BOX, 'rotation' => 12.5, 'kind' => 'text', 'text' => 'x', 'color' => '#000000', 'font' => 'heading', 'align' => 'center', 'extra' => 1],
            [...self::BOX, 'kind' => 'photo', 'photo' => self::PHOTO, 'text' => 'dropped'],
        ]], ['layers' => [
            [...self::BOX, 'rotation' => 12.5, 'kind' => 'text', 'text' => 'x', 'color' => '#000000', 'font' => 'heading', 'align' => 'center'],
            [...self::BOX, 'kind' => 'photo', 'photo' => self::PHOTO],
        ]]];
        yield 'the edges of the ranges' => ['board_center', ['photoAspect' => 20, 'titleOffset' => -1, 'titleScale' => 0.5, 'centerPlace' => 'middle', 'centerMode' => 'name']];
        yield 'a style' => ['style.pawns', ['style' => 'playful']];
    }

    /**
     * @param array<string, mixed> $override
     * @param array<string, mixed>|null $expected
     */
    #[DataProvider('validOverrides')]
    public function test_a_valid_override_leaves_in_its_shape(string $key, array $override, ?array $expected = null): void
    {
        $edition = resolve(EditionValidator::class)->edition(Editions::payload('e1', ['elements' => [$key => $override]]));

        self::assertSame([$key => $expected ?? $override], $edition['elements']);
    }
}
