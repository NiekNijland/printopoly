<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\PrintCacheKey;
use App\Print\PrintEditionData;
use Tests\TestCase;

/**
 * The deeds and the rules booklet print the amounts of the edition (B132): the cards part and the booklet get
 * the own amounts of every space. Before, they got only the names, so the PDF printed the standard rents, prices,
 * salary and tax while the editor showed the own ones (round 4, bugs 2 and 3).
 */
final class PartsKeepAmountsTest extends TestCase
{
    private function edition(int $rent = 12): PrintEditionData
    {
        return PrintEditionData::fromArray(['elements' => [
            'space.00' => ['amounts' => ['salary' => 240]],
            'space.04' => ['name' => 'Havengeld', 'amounts' => ['amount' => 180]],
            'space.06' => ['name' => 'Kombuiskade', 'amounts' => ['rent.1' => $rent], 'photo' => ['id' => 'x']],
        ]]);
    }

    public function test_the_cards_part_gets_the_amounts_of_the_spaces_for_its_deeds(): void
    {
        $elements = $this->edition()->onlyFor(PrintPart::Cards)->elements;

        self::assertSame(['name' => 'Kombuiskade', 'amounts' => ['rent.1' => 12]], $elements['space.06']);
        self::assertSame(['amounts' => ['salary' => 240]], $elements['space.00']);
    }

    public function test_the_rules_booklet_gets_the_prices_salary_and_tax_of_the_edition(): void
    {
        $elements = $this->edition()->onlyFor(PrintPart::RulesBooklet)->elements;

        self::assertSame(['amounts' => ['salary' => 240]], $elements['space.00']);
        self::assertSame(['name' => 'Havengeld', 'amounts' => ['amount' => 180]], $elements['space.04']);
        self::assertSame(['name' => 'Kombuiskade', 'amounts' => ['rent.1' => 12]], $elements['space.06']);
    }

    public function test_a_changed_rent_makes_a_new_cards_pdf(): void
    {
        self::assertNotSame(
            PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $this->edition(12)->onlyFor(PrintPart::Cards), []),
            PrintCacheKey::make(PrintPart::Cards, PrintSet::Printer, $this->edition(11)->onlyFor(PrintPart::Cards), []),
        );
    }

    public function test_money_still_gets_no_spaces(): void
    {
        self::assertArrayNotHasKey('space.06', $this->edition()->onlyFor(PrintPart::Money)->elements);
    }
}
