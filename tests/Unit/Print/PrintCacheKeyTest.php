<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\PrintCacheKey;
use App\Print\PrintEditionData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class PrintCacheKeyTest extends TestCase
{
    #[Test]
    public function the_same_input_gives_the_same_key_whatever_the_key_order(): void
    {
        $a = PrintEditionData::fromArray(['elements' => ['deed.01' => ['name' => 'A', 'color' => 'red'], 'deed.02' => []]]);
        $b = PrintEditionData::fromArray(['elements' => ['deed.02' => [], 'deed.01' => ['color' => 'red', 'name' => 'A']]]);

        self::assertSame(
            PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $a, ['p1' => 'x', 'p2' => 'y']),
            PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $b, ['p2' => 'y', 'p1' => 'x']),
        );
    }

    #[Test]
    public function every_ingredient_changes_the_key(): void
    {
        $edition = PrintEditionData::fromArray(['elements' => ['deed.01' => ['name' => 'A']]]);
        $base = PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $edition, ['p1' => 'x']);

        $changed = PrintEditionData::fromArray(['elements' => ['deed.01' => ['name' => 'B']]]);
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

    #[Test]
    public function a_part_only_depends_on_its_own_elements(): void
    {
        $edition = PrintEditionData::fromArray(['elements' => ['deed.01' => ['name' => 'A'], 'note.5' => ['look' => 'x']]]);
        $moneyChanged = PrintEditionData::fromArray(['elements' => ['deed.01' => ['name' => 'A'], 'note.5' => ['look' => 'y']]]);

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
