<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\Editions;
use Tests\TestCase;

final class EditionMessagesTest extends TestCase
{
    /**
     * @return iterable<string, array{array<string, mixed>, list<string>}>
     */
    public static function wrongEditions(): iterable
    {
        $profile = ['id' => 'x', 'name' => 'x', 'outer' => 500, 'corner' => 70, 'border' => 0, 'panels' => 4, 'boxLid' => ['w' => 1, 'h' => 1]];

        yield 'schema version' => [['schemaVersion' => 2], ['schemaVersion: expected 1']];
        yield 'id' => [['id' => 'a/b'], ['id: must be 1 to 64 letters, digits, dashes or underscores']];
        yield 'id too long' => [['id' => str_repeat('a', 65)], ['id: must be 1 to 64 letters, digits, dashes or underscores']];
        yield 'name' => [['name' => 5], ['name: must be a string of at most 120 characters']];
        yield 'language' => [['language' => 'de'], ['language: must be "nl" or "en"']];
        yield 'currency' => [['currency' => 'doubloon'], ['currency: unknown currency']];
        yield 'theme' => [['theme' => 'neon'], ['theme: unknown theme']];
        yield 'money amount' => [['moneyAmount' => 'lots'], ['moneyAmount: must be "four", "eight", "full" or null']];
        yield 'revision' => [['revision' => '1'], ['revision: must be a non-negative integer']];
        yield 'created at' => [['createdAt' => INF], ['createdAt: must be a number']];
        yield 'updated at' => [['updatedAt' => null], ['updatedAt: must be a number']];
        yield 'elements as a list' => [['elements' => ['x']], ['elements: must be an object']];
        yield 'too many elements' => [['elements' => array_fill_keys(array_map(static fn (int $i): string => "x{$i}", range(1, 201)), [])], ['elements: too many elements']];
        yield 'parts as a list' => [['parts' => [true]], ['parts: must be an object']];
        yield 'part not a boolean' => [['parts' => ['board' => true, 'deeds' => 1, 'cards' => true, 'money' => true, 'pawns' => true, 'boxLid' => true, 'houseRules' => true]], ['parts.deeds: must be a boolean']];
        yield 'extra part not a boolean' => [['parts' => ['board' => true, 'deeds' => true, 'cards' => true, 'money' => true, 'pawns' => true, 'boxLid' => true, 'houseRules' => true, 'invitation' => 'no']], ['parts.invitation: must be a boolean']];
        yield 'board off' => [['parts' => ['board' => false, 'deeds' => true, 'cards' => true, 'money' => true, 'pawns' => true, 'boxLid' => true, 'houseRules' => true]], ['parts.board: the board is always on']];
        yield 'profile as a list' => [['boardProfile' => [1]], ['boardProfile: must be an object']];
        yield 'profile without a name' => [['boardProfile' => [...$profile, 'name' => null]], ['boardProfile: id and name must be strings']];
        yield 'profile id too long' => [['boardProfile' => [...$profile, 'id' => str_repeat('a', 65)]], ['boardProfile: id and name must be strings']];
        yield 'profile name too long' => [['boardProfile' => [...$profile, 'name' => str_repeat('a', 121)]], ['boardProfile: id and name must be strings']];
        yield 'box lid' => [['boardProfile' => [...$profile, 'boxLid' => ['w' => 1]]], ['boardProfile.boxLid: w and h must be numbers']];
        yield 'three panels' => [['boardProfile' => [...$profile, 'panels' => 3]], ['boardProfile: outer, corner, border and panels (2 or 4) are required numbers']];
        yield 'outer as text' => [['boardProfile' => [...$profile, 'outer' => '500']], ['boardProfile: outer, corner, border and panels (2 or 4) are required numbers']];
        yield 'sizes at zero' => [['boardProfile' => [...$profile, 'outer' => 0, 'corner' => 0, 'border' => -1, 'boxLid' => ['w' => 0, 'h' => 1]]], [
            'boardProfile: the outer size must be greater than 0 mm',
            'boardProfile: the corner size must be greater than 0 mm',
            'boardProfile: the border cannot be negative',
            'boardProfile: the box lid size must be greater than 0 mm',
        ]];
        yield 'border eats the board' => [['boardProfile' => [...$profile, 'border' => 250]], ['boardProfile: the border leaves no room on this board size']];
        yield 'corners too big' => [['boardProfile' => [...$profile, 'corner' => 200]], ['boardProfile: a corner space plus 9 spaces does not fit the board']];
        yield 'centre gone' => [['boardProfile' => [...$profile, 'outer' => 140, 'corner' => 70]], [
            'boardProfile: a corner space plus 9 spaces does not fit the board',
            'boardProfile: the board centre disappears: choose smaller corner spaces',
        ]];
    }

    /**
     * @param array<string, mixed> $overrides
     * @param list<string> $messages
     */
    #[DataProvider('wrongEditions')]
    public function test_a_wrong_edition_names_what_is_wrong(array $overrides, array $messages): void
    {
        $errors = [];

        self::assertNull(resolve(EditionValidator::class)->tryEdition(Editions::payload('e1', $overrides), $errors));
        self::assertSame($messages, $errors);
    }

    public function test_every_missing_field_is_named(): void
    {
        $errors = [];

        self::assertNull(resolve(EditionValidator::class)->tryEdition([], $errors));
        self::assertSame([
            'schemaVersion: expected 1',
            'id: must be 1 to 64 letters, digits, dashes or underscores',
            'name: is required',
            'language: is required',
            'currency: is required',
            'theme: is required',
            'boardProfile: is required',
            'parts: is required',
            'revision: must be a non-negative integer',
            'createdAt: must be a number',
            'updatedAt: must be a number',
            'elements: must be an object',
        ], $errors);
    }

    public function test_an_edition_leaves_in_the_shape_of_the_browser(): void
    {
        $edition = resolve(EditionValidator::class)->edition(Editions::payload('e1', [
            'createdAt' => 1_000.0,
            'template' => 'village',
            'moneyAmount' => 'full',
            'printSelection' => ['set' => 'home', 'parts' => ['money', 'deeds']],
            'boardProfile' => ['id' => 'p', 'name' => 'P', 'outer' => 500, 'corner' => 70, 'border' => 5, 'panels' => 2, 'boxLid' => ['w' => 2, 'h' => 3, 'd' => 4], 'provisional' => false],
            'parts' => ['board' => true, 'deeds' => true, 'cards' => true, 'money' => true, 'pawns' => true, 'boxLid' => true, 'houseRules' => true, 'extra' => true],
        ]));

        self::assertSame([
            'schemaVersion' => 1,
            'id' => 'e1',
            'name' => 'Zaterdagclub',
            'language' => 'nl',
            'currency' => 'eur',
            'theme' => 'classic',
            'boardProfile' => ['id' => 'p', 'name' => 'P', 'outer' => 500, 'corner' => 70, 'border' => 5, 'panels' => 2, 'boxLid' => ['w' => 2, 'h' => 3]],
            'parts' => ['board' => true, 'deeds' => true, 'cards' => true, 'money' => true, 'pawns' => true, 'boxLid' => true, 'houseRules' => true, 'rulesBooklet' => false, 'invitation' => false],
            'elements' => [],
            'revision' => 0,
            'createdAt' => 1_000,
            'updatedAt' => 1_000,
            'template' => 'village',
            'moneyAmount' => 'full',
            'printSelection' => ['set' => 'home', 'parts' => ['board', 'deeds', 'money']],
        ], $edition);
    }

    public function test_an_edition_drops_an_unknown_template_and_a_money_amount_of_null(): void
    {
        $edition = resolve(EditionValidator::class)->edition(Editions::payload('e1', ['template' => 'circus', 'moneyAmount' => null, 'printSelection' => null]));

        self::assertArrayNotHasKey('template', $edition);
        self::assertArrayNotHasKey('moneyAmount', $edition);
        self::assertArrayNotHasKey('printSelection', $edition);
    }

    public function test_an_old_bank_key_moves_under_words_and_the_moved_key_wins(): void
    {
        self::assertSame(['words.bank' => ['name' => 'A']], EditionValidator::migrateElements(['bank' => ['name' => 'A']]));
        self::assertSame(['words.bank' => ['name' => 'B']], EditionValidator::migrateElements(['bank' => ['name' => 'A'], 'words.bank' => ['name' => 'B']]));
        self::assertSame(['space.01' => []], EditionValidator::migrateElements(['dice' => [], 'fold_models' => [], 'space.01' => []]));
        self::assertSame('nope', EditionValidator::migrateElements('nope'));

        $edition = resolve(EditionValidator::class)->edition(Editions::payload('e1', ['elements' => ['bank' => ['name' => 'Clubkas']]]));
        self::assertSame(['words.bank' => ['name' => 'Clubkas']], $edition['elements']);
    }

    /**
     * @return iterable<string, array{mixed, list<string>}>
     */
    public static function wrongPatches(): iterable
    {
        yield 'not an object' => ['nope', ['patch: must be an object']];
        yield 'no base revision' => [['name' => 'x'], ['baseRevision: must be a non-negative integer']];
        yield 'negative base revision' => [['baseRevision' => -1, 'name' => 'x'], ['baseRevision: must be a non-negative integer']];
        yield 'nothing to change' => [['baseRevision' => 1], ['patch: nothing to change']];
        yield 'a print selection of the wrong shape' => [['baseRevision' => 1, 'printSelection' => 'all'], ['patch: nothing to change']];
        yield 'wrong settings' => [['baseRevision' => 1, 'theme' => 'neon', 'language' => 'de'], ['language: must be "nl" or "en"', 'theme: unknown theme']];
        yield 'elements as a list' => [['baseRevision' => 1, 'elements' => [1]], ['elements: must be an object']];
        yield 'too many elements' => [['baseRevision' => 1, 'elements' => array_fill_keys(array_map(static fn (int $i): string => "x{$i}", range(1, 201)), null)], ['elements: too many elements']];
        yield 'unknown key removed' => [['baseRevision' => 1, 'elements' => ['nonsense' => null]], ['elements.nonsense: unknown element key']];
        yield 'wrong override' => [['baseRevision' => 1, 'elements' => ['space.01' => ['amount' => 5]]], ['elements.space.01.amount: field is not allowed here']];
    }

    /**
     * @param list<string> $messages
     */
    #[DataProvider('wrongPatches')]
    public function test_a_wrong_patch_names_what_is_wrong(mixed $input, array $messages): void
    {
        try {
            resolve(EditionValidator::class)->patch($input);
            self::fail('The patch was accepted.');
        } catch (ValidationException $validationException) {
            self::assertSame(['edition' => $messages], $validationException->errors());
        }
    }

    public function test_a_patch_keeps_the_settings_and_elements_it_changes(): void
    {
        $patch = resolve(EditionValidator::class)->patch([
            'baseRevision' => 2,
            'name' => 'Nieuw',
            'language' => 'en',
            'currency' => 'usd',
            'theme' => 'gala',
            'parts' => ['board' => true, 'deeds' => false, 'cards' => false, 'money' => false, 'pawns' => false, 'boxLid' => false, 'houseRules' => false, 'rulesBooklet' => true],
            'moneyAmount' => 'four',
            'printSelection' => null,
            'elements' => ['bank' => ['name' => 'Pot'], 'dice' => null, 'space.01' => null],
        ]);

        self::assertSame([
            'baseRevision' => 2,
            'name' => 'Nieuw',
            'language' => 'en',
            'currency' => 'usd',
            'theme' => 'gala',
            'parts' => ['board' => true, 'deeds' => false, 'cards' => false, 'money' => false, 'pawns' => false, 'boxLid' => false, 'houseRules' => false, 'rulesBooklet' => true, 'invitation' => false],
            'moneyAmount' => 'four',
            'printSelection' => null,
            'elements' => ['space.01' => null, 'words.bank' => ['name' => 'Pot']],
        ], $patch);
    }

    public function test_an_invalid_edition_throws_its_messages_under_edition(): void
    {
        try {
            resolve(EditionValidator::class)->edition('nope');
            self::fail('The edition was accepted.');
        } catch (ValidationException $validationException) {
            self::assertSame(['edition' => ['edition: must be an object']], $validationException->errors());
        }
    }
}
