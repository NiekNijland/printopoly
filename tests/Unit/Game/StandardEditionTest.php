<?php

declare(strict_types=1);

namespace Tests\Unit\Game;

use App\Game\StandardEdition;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

/**
 * @phpstan-import-type Space from StandardEdition
 * @phpstan-import-type Street from StandardEdition
 * @phpstan-import-type Station from StandardEdition
 * @phpstan-import-type Utility from StandardEdition
 * @phpstan-import-type Ownable from StandardEdition
 * @phpstan-import-type Tax from StandardEdition
 * @phpstan-import-type Corner from StandardEdition
 * @phpstan-import-type DeckSpace from StandardEdition
 */
final class StandardEditionTest extends TestCase
{
    public function test_it_has_40_spaces_at_their_own_position(): void
    {
        $edition = StandardEdition::load();

        $spaces = $edition->spaces();

        self::assertCount(40, $spaces);

        foreach ($spaces as $index => $space) {
            self::assertSame($index, $space['position']);
        }
    }

    public function test_fixed_spaces_are_on_the_classic_positions(): void
    {
        $edition = StandardEdition::load();

        $typeAt = fn (int ...$positions): array => array_map(fn (int $p): string => $edition->spaceAt($p)['type'], $positions);

        self::assertSame(['station', 'station', 'station', 'station'], $typeAt(5, 15, 25, 35));
        self::assertSame(['utility', 'utility'], $typeAt(12, 28));
        self::assertSame(['tax', 'tax'], $typeAt(4, 38));
        self::assertSame(['chance', 'chance', 'chance'], $typeAt(7, 22, 36));
        self::assertSame(['chest', 'chest', 'chest'], $typeAt(2, 17, 33));
        self::assertSame(['corner', 'corner', 'corner', 'corner'], $typeAt(0, 10, 20, 30));
    }

    public function test_it_has_28_ownables_of_which_22_streets(): void
    {
        $edition = StandardEdition::load();

        $deeds = $edition->deedsFor();
        $types = array_count_values(array_column($deeds, 'type'));

        self::assertCount(28, $deeds);
        self::assertSame(28, $edition->components()['titleDeeds']);
        self::assertSame(['street' => 22, 'station' => 4, 'utility' => 2], $types);
    }

    public function test_streets_are_in_8_groups_of_2_3_3_3_3_3_3_2(): void
    {
        $edition = StandardEdition::load();

        $order = ['brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue'];

        self::assertSame($order, array_column($edition->groups(), 'id'));
        self::assertSame(
            [2, 3, 3, 3, 3, 3, 3, 2],
            array_map(fn (string $group): int => count($edition->groupMembers($group)), $order),
        );
        self::assertSame([1, 3], array_column($edition->groupMembers('brown'), 'position'));
    }

    public function test_group_colours(): void
    {
        $edition = StandardEdition::load();

        self::assertSame(
            [
                'brown' => '#955436',
                'lightblue' => '#AAE0FA',
                'pink' => '#D93A96',
                'orange' => '#F7941D',
                'red' => '#ED1B24',
                'yellow' => '#FEF200',
                'green' => '#1FB25A',
                'darkblue' => '#0072BB',
            ],
            array_column($edition->groups(), 'color', 'id'),
        );
    }

    public function test_every_space_and_group_has_a_name_in_both_locales(): void
    {
        $edition = StandardEdition::load();

        foreach ([...$edition->spaces(), ...$edition->groups()] as $item) {
            foreach (['nl', 'en'] as $locale) {
                self::assertNotSame('', trim($item['name'][$locale]));
            }
        }
    }

    public function test_decks_have_16_cards_each_with_unique_ids_and_texts_in_both_locales(): void
    {
        $edition = StandardEdition::load();

        $chance = $edition->deck('chance');
        $chest = $edition->deck('chest');
        $cards = [...$chance, ...$chest];

        self::assertCount(16, $chance);
        self::assertCount(16, $chest);
        self::assertCount(32, array_unique(array_column($cards, 'id')));

        foreach (['nl', 'en'] as $locale) {
            foreach ($cards as $card) {
                self::assertNotSame('', trim($card['effect'][$locale]), $card['id']);
                self::assertNotSame('', trim($card['text'][$locale]), $card['id']);
                self::assertLessThanOrEqual(130, mb_strlen($card['text'][$locale]), $card['id']);
            }

            self::assertCount(32, array_unique(array_map(fn (array $c): string => $c['text'][$locale], $cards)));
        }
    }

    public function test_money_has_210_notes_and_1500_starting_cash(): void
    {
        $edition = StandardEdition::load();

        $money = $edition->money();
        $notes = $money['notes'];

        self::assertSame([1, 5, 10, 20, 50, 100, 500], array_column($notes, 'value'));
        self::assertSame(210, array_sum(array_column($notes, 'count')));
        self::assertSame([30], array_values(array_unique(array_column($notes, 'count'))));
        self::assertCount(7, array_unique(array_column($notes, 'color')));

        $split = $money['startingCash']['split'];
        $sum = array_sum(array_map(fn (array $part): int => $part['value'] * $part['count'], $split));

        self::assertSame(1500, $money['startingCash']['total']);
        self::assertSame(1500, $sum);
    }

    public function test_components_and_currencies(): void
    {
        $edition = StandardEdition::load();

        self::assertSame(
            ['titleDeeds' => 28, 'houses' => 32, 'hotels' => 12, 'cardSizeMm' => ['width' => 63, 'height' => 88]],
            $edition->components(),
        );
        self::assertSame(['€', '$', '£', 'M'], array_column($edition->currencies(), 'symbol'));
    }

    public function test_street_rents_strictly_increase_and_set_rent_is_double_the_base(): void
    {
        $edition = StandardEdition::load();

        foreach ($edition->groups() as $group) {
            foreach ($edition->groupMembers($group['id']) as $street) {
                $rent = $street['rent'];

                self::assertCount(6, $rent);

                for ($i = 1; $i < 6; $i++) {
                    self::assertGreaterThan($rent[$i - 1], $rent[$i], "position {$street['position']} step {$i}");
                }

                self::assertSame($rent[0] * 2, $edition->setRent($street['position']));
                self::assertLessThan($rent[1], $edition->setRent($street['position']));
            }
        }

        self::assertSame(4, $edition->setRent(1));
        self::assertSame(100, $edition->setRent(39));
    }

    public function test_reference_rent_tables(): void
    {
        $edition = StandardEdition::load();

        self::assertSame([2, 10, 30, 90, 160, 250], $edition->rentTable(1));
        self::assertSame([16, 80, 220, 600, 800, 1000], $edition->rentTable(19));
        self::assertSame([28, 150, 450, 1000, 1200, 1400], $edition->rentTable(34));
        self::assertSame([50, 200, 600, 1400, 1700, 2000], $edition->rentTable(39));

        foreach ([5, 15, 25, 35] as $position) {
            self::assertSame([25, 50, 100, 200], $edition->rentTable($position));
        }

        foreach ([12, 28] as $position) {
            $utility = $edition->spaceAt($position);

            if ($utility['type'] !== 'utility') {
                $this->fail("Position {$position} is not a utility.");
            }

            self::assertSame([4, 10], $utility['multipliers']);
        }
    }

    public function test_mortgage_is_half_the_price_and_unmortgage_costs_10_percent_more(): void
    {
        $edition = StandardEdition::load();

        foreach ($edition->deedsFor() as $deed) {
            self::assertSame($deed['price'] / 2, $edition->mortgage($deed['position']));
        }

        self::assertSame(33, $edition->unmortgage(1));
        self::assertSame(110, $edition->unmortgage(5));
        self::assertSame(83, $edition->unmortgage(12));
        self::assertSame(220, $edition->unmortgage(39));
    }

    public function test_house_cost_is_50_100_150_200_per_side(): void
    {
        $edition = StandardEdition::load();

        $sides = $edition->spacesBySide();
        self::assertSame([50], $this->houseCosts($sides['bottom']));
        self::assertSame([100], $this->houseCosts($sides['left']));
        self::assertSame([150], $this->houseCosts($sides['top']));
        self::assertSame([200], $this->houseCosts($sides['right']));
        self::assertSame([0, 10, 20, 30], array_column($sides['corners'], 'position'));
        self::assertCount(9, $sides['bottom']);
    }

    public function test_taxes_and_salary(): void
    {
        $edition = StandardEdition::load();

        foreach ([4 => 200, 38 => 100] as $position => $amount) {
            $tax = $edition->spaceAt($position);

            if ($tax['type'] !== 'tax') {
                $this->fail("Position {$position} is not a tax space.");
            }

            self::assertSame($amount, $tax['amount']);
        }

        $start = $edition->spaceAt(0);

        if ($start['type'] !== 'corner') {
            $this->fail('Position 0 is not a corner.');
        }

        self::assertSame(200, $start['salary'] ?? null);
    }

    public function test_invalid_lookups_throw(): void
    {
        $edition = StandardEdition::load();

        $this->expectException(InvalidArgumentException::class);
        $edition->rentTable(4);
    }

    public function test_mortgage_on_a_corner_throws(): void
    {
        $edition = StandardEdition::load();

        $this->expectException(InvalidArgumentException::class);
        $edition->mortgage(0);
    }

    public function test_format_money(): void
    {
        $edition = StandardEdition::load();

        self::assertSame('€ 1.500', $edition->formatMoney(1500, 'eur', 'nl'));
        self::assertSame('€1,500', $edition->formatMoney(1500, 'eur', 'en'));
        self::assertSame('£200', $edition->formatMoney(200, 'gbp', 'en'));
        self::assertSame('M 50', $edition->formatMoney(50, 'play', 'nl'));
    }

    /**
     * @param list<Space> $side
     * @return list<int>
     */
    private function houseCosts(array $side): array
    {
        $found = [];

        foreach ($side as $space) {
            if ($space['type'] === 'street') {
                $found[$space['houseCost']] = $space['houseCost'];
            }
        }

        return array_values($found);
    }
}
