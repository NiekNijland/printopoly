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
            PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $a, ['p1' => 'x', 'p2' => 'y']),
            PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $b, ['p2' => 'y', 'p1' => 'x']),
        );
    }

    public function test_every_ingredient_changes_the_key(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'A']]]);
        $base = PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $edition, ['p1' => 'x']);

        $changed = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'B']]]);
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $changed, ['p1' => 'x']), 'edition data');
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $edition, ['p1' => 'z']), 'asset');
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::Cards, PrintSet::Home, $edition, ['p1' => 'x']), 'set');
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::Money, PrintSet::Printer, $edition, ['p1' => 'x']), 'part');

        config(['printopoly.print.profile.outer' => 600]);
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $edition, ['p1' => 'x']), 'profile');
        config(['printopoly.print.profile.outer' => 500]);

        config(['printopoly.print.release' => 'v2']);
        self::assertNotSame($base, PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $edition, ['p1' => 'x']), 'release');
    }

    public function test_a_part_only_depends_on_its_own_elements(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'A'], 'note.5' => ['look' => 'x']]]);
        $moneyChanged = resolve(PrintEditionReader::class)->fromArray(['elements' => ['deed.01' => ['name' => 'A'], 'note.5' => ['look' => 'y']]]);

        self::assertSame(
            PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $edition->onlyFor(PrintPart::Cards), []),
            PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $moneyChanged->onlyFor(PrintPart::Cards), []),
        );
        self::assertNotSame(
            PrintCacheKey::make(PrintPart::Money, PrintSet::Printer, $edition->onlyFor(PrintPart::Money), []),
            PrintCacheKey::make(PrintPart::Money, PrintSet::Printer, $moneyChanged->onlyFor(PrintPart::Money), []),
        );
    }
}
