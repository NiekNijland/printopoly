<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintCacheKey;
use App\Modules\Print\Support\PrintEditionReader;
use Tests\TestCase;

final class PrintCacheKeyTest extends TestCase
{
    public function test_the_same_input_gives_the_same_key_whatever_the_key_order(): void
    {
        $a = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'A', 'color' => 'red'], 'deed.02' => []]]);
        $b = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.02' => [], 'deed.01' => ['color' => 'red', 'name' => 'A']]]);

        self::assertSame(
            PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $a, ['p1' => 'x', 'p2' => 'y']),
            PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $b, ['p2' => 'y', 'p1' => 'x']),
        );
    }

    public function test_every_ingredient_changes_the_key(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'A']]]);
        $base = PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $edition, ['p1' => 'x']);

        $changed = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'B']]]);
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $changed, ['p1' => 'x']), 'edition data');
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $edition, ['p1' => 'z']), 'asset');
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::CARDS, PrintSet::HOME, $edition, ['p1' => 'x']), 'set');
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::MONEY, PrintSet::PRINTER, $edition, ['p1' => 'x']), 'part');

        config(['printopoly.print.profile.outer' => 600]);
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $edition, ['p1' => 'x']), 'profile');
        config(['printopoly.print.profile.outer' => 500]);

        config(['printopoly.print.release' => 'v2']);
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $edition, ['p1' => 'x']), 'release');
    }

    public function test_a_part_only_depends_on_its_own_elements(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'A'], 'note.5' => ['look' => 'x']]]);
        $moneyChanged = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'A'], 'note.5' => ['look' => 'y']]]);

        self::assertSame(
            PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $edition->onlyFor(PrintPart::CARDS), []),
            PrintCacheKey::make(PrintPart::CARDS, PrintSet::PRINTER, $moneyChanged->onlyFor(PrintPart::CARDS), []),
        );
        self::assertNotSame(
            PrintCacheKey::make(PrintPart::MONEY, PrintSet::PRINTER, $edition->onlyFor(PrintPart::MONEY), []),
            PrintCacheKey::make(PrintPart::MONEY, PrintSet::PRINTER, $moneyChanged->onlyFor(PrintPart::MONEY), []),
        );
    }
}
