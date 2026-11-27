<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Boxes\Support;

use App\Modules\Boxes\Support\BoxSnapshot;
use App\Modules\Boxes\Support\BoxTargets;
use App\Modules\Editions\Support\StandardEdition;
use PHPUnit\Framework\TestCase;

final class BoxSnapshotTest extends TestCase
{
    public function test_an_empty_input_becomes_the_classic_theme_with_cards_and_without_pawns(): void
    {
        self::assertSame([
            'theme' => 'classic',
            'currency' => null,
            'parts' => ['cards' => true, 'pawns' => false],
            'elements' => [],
        ], $this->snapshot()->clean([]));
    }

    public function test_it_keeps_a_known_theme_a_currency_and_the_parts(): void
    {
        $clean = $this->snapshot()->clean(['theme' => 'riso', 'currency' => 'eur', 'parts' => ['cards' => false, 'pawns' => true]]);

        self::assertSame('riso', $clean['theme']);
        self::assertSame('eur', $clean['currency']);
        self::assertSame(['cards' => false, 'pawns' => true], $clean['parts']);
    }

    public function test_an_unknown_theme_or_currency_is_dropped(): void
    {
        $clean = $this->snapshot()->clean(['theme' => 'neon', 'currency' => 'EURO!', 'parts' => 'alles']);

        self::assertSame('classic', $clean['theme']);
        self::assertNull($clean['currency']);
        self::assertSame(['cards' => true, 'pawns' => false], $clean['parts']);
    }

    public function test_it_keeps_the_tidied_words_of_targets_and_drops_everything_else(): void
    {
        $clean = $this->snapshot()->clean(['elements' => [
            'space.01' => ['name' => "  Molenweg\n", 'photo' => ['photoId' => 'x']],
            'space.02' => ['name' => 'Algemeen Fonds'],
            'space.03' => ['name' => '   '],
            'card.chance.01' => ['text' => 'Ga naar start', 'name' => 'genegeerd'],
            'group.brown' => ['town' => 'Zwolle'],
            'pawn.02' => ['name' => str_repeat('a', 60)],
            'board_center' => ['name' => 'Lisa en Thomas'],
            'money.notes' => ['name' => 'Briefjes'],
            'space.05' => 'Station',
        ]]);

        self::assertSame([
            'space.01' => ['name' => 'Molenweg'],
            'space.02' => ['name' => 'Algemeen Fonds'],
            'card.chance.01' => ['text' => 'Ga naar start'],
            'group.brown' => ['town' => 'Zwolle'],
            'pawn.02' => ['name' => str_repeat('a', BoxTargets::MAX_NAME)],
        ], $clean['elements']);
    }

    public function test_an_extra_card_is_kept_only_when_the_owner_added_it(): void
    {
        $clean = $this->snapshot()->clean(['elements' => [
            'card.chance.17' => ['text' => 'Trakteer de tafel', 'added' => true],
            'card.chance.18' => ['text' => 'Niet toegevoegd'],
            'card.chest.17' => ['added' => true],
        ]]);

        self::assertSame([
            'card.chance.17' => ['added' => true, 'text' => 'Trakteer de tafel'],
            'card.chest.17' => ['added' => true],
        ], $clean['elements']);
    }

    public function test_the_words_of_the_edition_keep_a_name_and_only_a_plural_or_symbol_keeps_a_text(): void
    {
        $clean = $this->snapshot()->clean(['elements' => [
            'words.chest' => ['name' => 'Huwelijkskas', 'text' => 'Huwelijkskassen'],
            'words.station' => ['name' => 'Bushalte', 'text' => 'Bushaltes'],
            'words.currency' => ['text' => 'Knikkers'],
            'words.house' => ['name' => 1, 'text' => ' '],
            'words.bank' => ['name' => 'Spaarpot'],
        ]]);

        self::assertSame([
            'words.chest' => ['name' => 'Huwelijkskas'],
            'words.station' => ['name' => 'Bushalte', 'text' => 'Bushaltes'],
            'words.currency' => ['text' => 'Knikke'],
        ], $clean['elements']);
    }

    public function test_the_language_falls_back_to_dutch(): void
    {
        self::assertSame('en', BoxSnapshot::language('en'));
        self::assertSame('nl', BoxSnapshot::language('fr'));
        self::assertSame('nl', BoxSnapshot::language(null));
    }

    private function snapshot(): BoxSnapshot
    {
        return new BoxSnapshot(new BoxTargets(StandardEdition::load()));
    }
}
