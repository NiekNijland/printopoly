<?php

declare(strict_types=1);

namespace Tests\Unit\Game;

use App\Game\StandardEdition;
use InvalidArgumentException;
use Override;
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
    private StandardEdition $edition;

    #[Override]
    protected function setUp(): void
    {
        $this->edition = StandardEdition::load();
    }

    public function test_it_has_40_spaces_at_their_own_position(): void
    {
        $spaces = $this->edition->spaces();

        $this->assertCount(40, $spaces);

        foreach ($spaces as $index => $space) {
            $this->assertSame($index, $space['position']);
        }
    }

    public function test_fixed_spaces_are_on_the_classic_positions(): void
    {
        $typeAt = fn (int ...$positions): array => array_map(fn (int $p): string => $this->edition->spaceAt($p)['type'], $positions);

        $this->assertSame(['station', 'station', 'station', 'station'], $typeAt(5, 15, 25, 35));
        $this->assertSame(['utility', 'utility'], $typeAt(12, 28));
        $this->assertSame(['tax', 'tax'], $typeAt(4, 38));
        $this->assertSame(['chance', 'chance', 'chance'], $typeAt(7, 22, 36));
        $this->assertSame(['chest', 'chest', 'chest'], $typeAt(2, 17, 33));
        $this->assertSame(['corner', 'corner', 'corner', 'corner'], $typeAt(0, 10, 20, 30));
    }

    public function test_it_has_28_ownables_of_which_22_streets(): void
    {
        $deeds = $this->edition->deedsFor();
        $types = array_count_values(array_column($deeds, 'type'));

        $this->assertCount(28, $deeds);
        $this->assertSame(28, $this->edition->components()['titleDeeds']);
        $this->assertSame(['street' => 22, 'station' => 4, 'utility' => 2], $types);
    }

    public function test_streets_are_in_8_groups_of_2_3_3_3_3_3_3_2(): void
    {
        $order = ['brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue'];

        $this->assertSame($order, array_column($this->edition->groups(), 'id'));
        $this->assertSame(
            [2, 3, 3, 3, 3, 3, 3, 2],
            array_map(fn (string $group): int => count($this->edition->groupMembers($group)), $order),
        );
        $this->assertSame([1, 3], array_column($this->edition->groupMembers('brown'), 'position'));
    }

    public function test_group_colours(): void
    {
        $this->assertSame(
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
            array_column($this->edition->groups(), 'color', 'id'),
        );
    }

    public function test_every_space_and_group_has_a_name_in_both_locales(): void
    {
        foreach ([...$this->edition->spaces(), ...$this->edition->groups()] as $item) {
            foreach (['nl', 'en'] as $locale) {
                $this->assertNotSame('', trim($item['name'][$locale]));
            }
        }
    }

    public function test_decks_have_16_cards_each_with_unique_ids_and_texts_in_both_locales(): void
    {
        $chance = $this->edition->deck('chance');
        $chest = $this->edition->deck('chest');
        $cards = [...$chance, ...$chest];

        $this->assertCount(16, $chance);
        $this->assertCount(16, $chest);
        $this->assertCount(32, array_unique(array_column($cards, 'id')));

        foreach (['nl', 'en'] as $locale) {
            foreach ($cards as $card) {
                $this->assertNotSame('', trim($card['effect'][$locale]), $card['id']);
                $this->assertNotSame('', trim($card['text'][$locale]), $card['id']);
                $this->assertLessThanOrEqual(130, mb_strlen($card['text'][$locale]), $card['id']);
            }

            $this->assertCount(32, array_unique(array_map(fn (array $c): string => $c['text'][$locale], $cards)));
        }
    }

    public function test_money_has_210_notes_and_1500_starting_cash(): void
    {
        $money = $this->edition->money();
        $notes = $money['notes'];

        $this->assertSame([1, 5, 10, 20, 50, 100, 500], array_column($notes, 'value'));
        $this->assertSame(210, array_sum(array_column($notes, 'count')));
        $this->assertSame([30], array_values(array_unique(array_column($notes, 'count'))));
        $this->assertCount(7, array_unique(array_column($notes, 'color')));

        $split = $money['startingCash']['split'];
        $sum = array_sum(array_map(fn (array $part): int => $part['value'] * $part['count'], $split));

        $this->assertSame(1500, $money['startingCash']['total']);
        $this->assertSame(1500, $sum);
    }

    public function test_components_and_currencies(): void
    {
        $this->assertSame(
            ['titleDeeds' => 28, 'houses' => 32, 'hotels' => 12, 'cardSizeMm' => ['width' => 63, 'height' => 88]],
            $this->edition->components(),
        );
        $this->assertSame(['€', '$', '£', 'M'], array_column($this->edition->currencies(), 'symbol'));
    }

    public function test_street_rents_strictly_increase_and_set_rent_is_double_the_base(): void
    {
        foreach ($this->edition->groups() as $group) {
            foreach ($this->edition->groupMembers($group['id']) as $street) {
                $rent = $street['rent'];

                $this->assertCount(6, $rent);

                for ($i = 1; $i < 6; $i++) {
                    $this->assertGreaterThan($rent[$i - 1], $rent[$i], "position {$street['position']} step {$i}");
                }

                $this->assertSame($rent[0] * 2, $this->edition->setRent($street['position']));
                $this->assertLessThan($rent[1], $this->edition->setRent($street['position']));
            }
        }

        $this->assertSame(4, $this->edition->setRent(1));
        $this->assertSame(100, $this->edition->setRent(39));
    }

    public function test_reference_rent_tables(): void
    {
        $this->assertSame([2, 10, 30, 90, 160, 250], $this->edition->rentTable(1));
        $this->assertSame([16, 80, 220, 600, 800, 1000], $this->edition->rentTable(19));
        $this->assertSame([28, 150, 450, 1000, 1200, 1400], $this->edition->rentTable(34));
        $this->assertSame([50, 200, 600, 1400, 1700, 2000], $this->edition->rentTable(39));

        foreach ([5, 15, 25, 35] as $position) {
            $this->assertSame([25, 50, 100, 200], $this->edition->rentTable($position));
        }

        foreach ([12, 28] as $position) {
            $utility = $this->edition->spaceAt($position);

            if ($utility['type'] !== 'utility') {
                $this->fail("Position {$position} is not a utility.");
            }

            $this->assertSame([4, 10], $utility['multipliers']);
        }
    }

    public function test_mortgage_is_half_the_price_and_unmortgage_costs_10_percent_more(): void
    {
        foreach ($this->edition->deedsFor() as $deed) {
            $this->assertSame($deed['price'] / 2, $this->edition->mortgage($deed['position']));
        }

        $this->assertSame(33, $this->edition->unmortgage(1));
        $this->assertSame(110, $this->edition->unmortgage(5));
        $this->assertSame(83, $this->edition->unmortgage(12));
        $this->assertSame(220, $this->edition->unmortgage(39));
    }

    public function test_house_cost_is_50_100_150_200_per_side(): void
    {
        $sides = $this->edition->spacesBySide();
        $this->assertSame([50], $this->houseCosts($sides['bottom']));
        $this->assertSame([100], $this->houseCosts($sides['left']));
        $this->assertSame([150], $this->houseCosts($sides['top']));
        $this->assertSame([200], $this->houseCosts($sides['right']));
        $this->assertSame([0, 10, 20, 30], array_column($sides['corners'], 'position'));
        $this->assertCount(9, $sides['bottom']);
    }

    public function test_taxes_and_salary(): void
    {
        foreach ([4 => 200, 38 => 100] as $position => $amount) {
            $tax = $this->edition->spaceAt($position);

            if ($tax['type'] !== 'tax') {
                $this->fail("Position {$position} is not a tax space.");
            }

            $this->assertSame($amount, $tax['amount']);
        }

        $start = $this->edition->spaceAt(0);

        if ($start['type'] !== 'corner') {
            $this->fail('Position 0 is not a corner.');
        }

        $this->assertSame(200, $start['salary'] ?? null);
    }

    public function test_invalid_lookups_throw(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->edition->rentTable(4);
    }

    public function test_mortgage_on_a_corner_throws(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->edition->mortgage(0);
    }

    public function test_format_money(): void
    {
        $this->assertSame('€ 1.500', $this->edition->formatMoney(1500, 'eur', 'nl'));
        $this->assertSame('€1,500', $this->edition->formatMoney(1500, 'eur', 'en'));
        $this->assertSame('£200', $this->edition->formatMoney(200, 'gbp', 'en'));
        $this->assertSame('M 50', $this->edition->formatMoney(50, 'play', 'nl'));
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
