<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions;

use App\Modules\Editions\Enums\ElementKind;
use App\Modules\Editions\Support\EditionValidator;
use App\Modules\Editions\Support\StandardEdition;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintCacheKey;
use App\Modules\Print\Support\PrintEditionData;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\Editions;
use Tests\TestCase;

/**
 * The words of an edition (houses, hotels, the jail, the decks, the currency) and the short text of a corner.
 * The rules mirror resources/js/lib/edition/keys.ts and schema.ts.
 */
final class WordsTest extends TestCase
{
    public function test_every_word_is_a_key_with_a_name_and_a_text(): void
    {
        ['standard' => $standard] = $this->scenario();

        foreach (['house', 'hotel', 'jail', 'currency', 'chance', 'chest', 'station', 'utility'] as $word) {
            $kind = ElementKind::fromKey('words.' . $word, $standard);

            self::assertSame(ElementKind::Words, $kind);
            self::assertSame(['name', 'text'], $kind->allowedFields());
        }

        self::assertNull(ElementKind::fromKey('words.pawn', $standard));
        self::assertNull(ElementKind::fromKey('words', $standard));
        self::assertNull(ElementKind::fromKey('words.house.extra', $standard));
    }

    public function test_it_stores_the_words_and_the_text_of_a_corner(): void
    {
        ['validator' => $validator] = $this->scenario();

        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'words.house' => ['name' => 'Schuurtje', 'text' => 'Schuurtjes'],
                'words.hotel' => ['name' => 'Boerderij'],
                'words.jail' => ['name' => 'de Strafbank'],
                'words.currency' => ['name' => 'Raalter pegels', 'text' => 'RP'],
                'words.chance' => ['name' => 'Roddel'],
                'words.chest' => ['name' => 'Dorpskas'],
                'words.station' => ['name' => 'Bushalte', 'text' => 'Bushaltes'],
                'words.utility' => ['name' => 'Fabriek'],
                'space.00' => ['name' => 'Begin', 'text' => 'Pak 200 pegels'],
                'space.10' => ['text' => 'Strafbank'],
                'space.20' => ['text' => 'Even uitrusten'],
                'space.30' => ['text' => 'Rechtstreeks'],
                'space.04' => ['name' => 'Dorpsbelasting'],
            ],
        ]));

        self::assertSame(['name' => 'Schuurtje', 'text' => 'Schuurtjes'], $edition['elements']['words.house']);
        self::assertSame(['name' => 'Raalter pegels', 'text' => 'RP'], $edition['elements']['words.currency']);
        self::assertSame(['name' => 'Begin', 'text' => 'Pak 200 pegels'], $edition['elements']['space.00']);
        self::assertSame(['text' => 'Strafbank'], $edition['elements']['space.10']);
        self::assertSame(['name' => 'Bushalte', 'text' => 'Bushaltes'], $edition['elements']['words.station']);
        self::assertCount(13, $edition['elements']);
    }

    /**
     * @return iterable<string, array{string, array<string, mixed>}>
     */
    public static function invalidWords(): iterable
    {
        yield 'a word that does not exist' => ['words.pawn', ['name' => 'x']];
        yield 'an amount on a word' => ['words.house', ['amount' => 3]];
        yield 'a photo on a word' => ['words.house', ['photo' => ['photoId' => 'p', 'cx' => 0, 'cy' => 0, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]]];
        yield 'a name of 41 characters' => ['words.hotel', ['name' => str_repeat('x', 41)]];
        yield 'a plural of 41 characters' => ['words.house', ['text' => str_repeat('x', 41)]];
        yield 'a symbol of 7 characters' => ['words.currency', ['text' => 'ABCDEFG']];
        yield 'a text on a street' => ['space.01', ['text' => 'x']];
        yield 'a text on a card space' => ['space.02', ['text' => 'x']];
        yield 'a text on a tax space' => ['space.04', ['text' => 'x']];
        yield 'a corner text of 121 characters' => ['space.00', ['text' => str_repeat('x', 121)]];
        yield 'a name as number' => ['words.house', ['name' => 3]];
    }

    /**
     * @param array<string, mixed> $override
     */
    #[DataProvider('invalidWords')]
    public function test_it_refuses_a_word_that_does_not_fit_the_rules(string $key, array $override): void
    {
        ['validator' => $validator] = $this->scenario();

        $this->expectException(ValidationException::class);

        $validator->edition(Editions::payload('e1', ['elements' => [$key => $override]]));
    }

    public function test_it_accepts_the_longest_word_and_symbol_and_corner_text(): void
    {
        ['validator' => $validator] = $this->scenario();

        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'words.hotel' => ['name' => str_repeat('x', 40)],
                'words.currency' => ['text' => 'ABCDEF'],
                'space.20' => ['text' => str_repeat('x', 120)],
            ],
        ]));

        self::assertCount(3, $edition['elements']);
    }

    public function test_the_words_go_to_every_part_that_prints_them(): void
    {
        $edition = PrintEditionData::fromArray(['elements' => [
            'words.house' => ['name' => 'Schuurtje'],
            'deed.01' => ['name' => 'A'],
            'note.5' => ['color' => '#FFFFFF'],
            'pawn.01' => ['name' => 'Hoed'],
        ]]);

        // The lid shows the board (B256), so it prints the words too.
        foreach ([PrintPart::Board, PrintPart::Cards, PrintPart::Money, PrintPart::BoxLid] as $part) {
            self::assertArrayHasKey('words.house', $edition->onlyFor($part)->elements, $part->value);
        }

        self::assertArrayNotHasKey('words.house', $edition->onlyFor(PrintPart::Tokens)->elements);
    }

    public function test_a_changed_word_makes_the_printed_parts_outdated_but_not_the_pawns(): void
    {
        $base = PrintEditionData::fromArray(['elements' => ['words.currency' => ['text' => 'RP']]]);
        $changed = PrintEditionData::fromArray(['elements' => ['words.currency' => ['text' => 'PG']]]);

        foreach ([PrintPart::Board, PrintPart::Cards, PrintPart::Money] as $part) {
            self::assertNotSame(
                PrintCacheKey::make($part, PrintSet::Printer, $base->onlyFor($part), []),
                PrintCacheKey::make($part, PrintSet::Printer, $changed->onlyFor($part), []),
                $part->value,
            );
        }

        self::assertSame(
            PrintCacheKey::make(PrintPart::Tokens, PrintSet::Printer, $base->onlyFor(PrintPart::Tokens), []),
            PrintCacheKey::make(PrintPart::Tokens, PrintSet::Printer, $changed->onlyFor(PrintPart::Tokens), []),
        );
    }

    public function test_the_corner_text_stays_with_the_board(): void
    {
        $edition = PrintEditionData::fromArray(['elements' => ['space.00' => ['name' => 'Begin', 'text' => 'Pak 200 pegels']]]);

        self::assertSame(['name' => 'Begin', 'text' => 'Pak 200 pegels'], $edition->onlyFor(PrintPart::Board)->elements['space.00']);
        // The cards only need the name, for the texts that name Start.
        self::assertSame(['name' => 'Begin'], $edition->onlyFor(PrintPart::Cards)->elements['space.00']);
    }

    /**
     * @return array{standard: StandardEdition, validator: EditionValidator}
     */
    private function scenario(): array
    {
        $standard = StandardEdition::load();
        $validator = new EditionValidator($standard);

        return ['standard' => $standard, 'validator' => $validator];
    }
}
