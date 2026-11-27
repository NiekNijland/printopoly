<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\Amounts;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class AmountsTest extends TestCase
{
    public function test_an_amount_moves_twenty_percent_either_way_in_whole_amounts(): void
    {
        self::assertSame(['min' => 48, 'max' => 72], Amounts::range(60));
        self::assertSame(['min' => 48, 'max' => 72], Amounts::range(-60));
        self::assertSame(['min' => 2, 'max' => 2], Amounts::range(2));
        self::assertSame(['min' => 6, 'max' => 8], Amounts::range(7));
    }

    public function test_a_street_offers_price_rents_house_cost_and_mortgage(): void
    {
        $street = ['position' => 1, 'type' => 'street', 'name' => ['nl' => 'Molenweg', 'en' => 'Mill Road'], 'group' => 'brown', 'price' => 60, 'rent' => [2, 10], 'houseCost' => 50, 'mortgage' => 30];

        self::assertSame(['price' => 60, 'rent.0' => 2, 'rent.1' => 10, 'houseCost' => 50, 'mortgage' => 30], Amounts::fields($street));
    }

    public function test_a_station_has_no_house_cost_and_a_utility_no_rents(): void
    {
        $station = ['position' => 5, 'type' => 'station', 'name' => ['nl' => 'Station Noord', 'en' => 'North Station'], 'price' => 200, 'rent' => [25, 50], 'mortgage' => 100];
        $utility = ['position' => 12, 'type' => 'utility', 'name' => ['nl' => 'Waterleiding', 'en' => 'Water Works'], 'price' => 150, 'multipliers' => [4, 10], 'mortgage' => 75];

        self::assertSame(['price' => 200, 'rent.0' => 25, 'rent.1' => 50, 'mortgage' => 100], Amounts::fields($station));
        self::assertSame(['price' => 150, 'mortgage' => 75], Amounts::fields($utility));
    }

    public function test_a_tax_offers_its_amount_and_only_the_start_corner_its_salary(): void
    {
        $tax = ['position' => 4, 'type' => 'tax', 'name' => ['nl' => 'Belasting', 'en' => 'Tax'], 'amount' => 200];
        $start = ['position' => 0, 'type' => 'corner', 'name' => ['nl' => 'Start', 'en' => 'Go'], 'corner' => 'start', 'salary' => 200];
        $jail = ['position' => 10, 'type' => 'corner', 'name' => ['nl' => 'Gevangenis', 'en' => 'Jail'], 'corner' => 'jail', 'salary' => 50];
        $chance = ['position' => 7, 'type' => 'chance', 'name' => ['nl' => 'Kans', 'en' => 'Chance']];

        self::assertSame(['amount' => 200], Amounts::fields($tax));
        self::assertSame(['salary' => 200], Amounts::fields($start));
        self::assertSame([], Amounts::fields($jail));
        self::assertSame([], Amounts::fields($chance));
    }

    /**
     * @return iterable<string, array{int|float, bool}>
     */
    public static function cardAmounts(): iterable
    {
        yield 'the standard amount' => [50, true];
        yield 'the lowest whole amount' => [40, true];
        yield 'the highest whole amount' => [60, true];
        yield 'below the range' => [39, false];
        yield 'above the range' => [61, false];
        yield 'received instead of paid' => [-55, true];
        yield 'switched off' => [0, true];
        yield 'switched off as a float' => [0.0, true];
        yield 'a whole float' => [45.0, true];
        yield 'not a whole amount' => [45.5, false];
    }

    #[DataProvider('cardAmounts')]
    public function test_a_card_amount_stays_in_the_range_of_its_standard_amount(int|float $value, bool $allowed): void
    {
        $card = ['id' => 'chance.01', 'effect' => ['nl' => 'betaal', 'en' => 'pay'], 'text' => ['nl' => 'Betaal 50', 'en' => 'Pay 50'], 'amount' => 50];

        self::assertSame($allowed, Amounts::cardAmountAllowed($card, $value));
    }

    public function test_a_card_without_a_standard_amount_takes_no_amount(): void
    {
        $card = ['id' => 'chance.02', 'effect' => ['nl' => 'ga', 'en' => 'go'], 'text' => ['nl' => 'Ga naar start', 'en' => 'Go to start']];

        self::assertFalse(Amounts::cardAmountAllowed($card, 0));
        self::assertFalse(Amounts::cardAmountAllowed($card, 50));
    }

    /**
     * @return iterable<string, array{int|float, bool}>
     */
    public static function extraCardAmounts(): iterable
    {
        yield 'one' => [1, true];
        yield 'the most' => [500, true];
        yield 'received' => [-500, true];
        yield 'a whole float' => [20.0, true];
        yield 'zero' => [0, false];
        yield 'zero as a float' => [0.0, false];
        yield 'over the most' => [501, false];
        yield 'not whole' => [2.5, false];
    }

    #[DataProvider('extraCardAmounts')]
    public function test_an_extra_card_takes_a_whole_amount_up_to_five_hundred(int|float $value, bool $allowed): void
    {
        self::assertSame($allowed, Amounts::extraCardAmountAllowed($value));
    }
}
