<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Support\ElementRepairer;
use Tests\TestCase;

final class ElementRepairerTest extends TestCase
{
    public function test_a_valid_element_is_kept_as_stored(): void
    {
        $repaired = [];
        $elements = ['space.01' => ['name' => 'A', 'layout' => 'full', 'amounts' => ['price' => 50.0]], 7 => []];

        self::assertSame(['space.01' => $elements['space.01']], resolve(ElementRepairer::class)->repair($elements, $repaired));
        self::assertSame(['elements.7: dropped'], $repaired);
    }

    public function test_amounts_are_pulled_into_their_range_and_unknown_ids_go(): void
    {
        $repaired = [];

        $out = resolve(ElementRepairer::class)->repair([
            'space.01' => ['amounts' => ['price' => 100.4, 'rent.0' => 1, 'bogus' => 5, 'mortgage' => 'x', 'houseCost' => INF], 'name' => null, 'layout' => 'x'],
            'space.04' => ['amounts' => [], 'text' => 'x'],
            'space.05' => ['amounts' => 'x', 'name' => 'Station'],
        ], $repaired);

        self::assertSame([
            'space.01' => ['amounts' => ['price' => 72, 'rent.0' => 2]],
            'space.04' => ['amounts' => []],
            'space.05' => ['name' => 'Station'],
        ], $out);
        self::assertSame([
            'elements.space.01.amounts: pulled into range',
            'elements.space.04.text: dropped',
            'elements.space.05.amounts: dropped',
        ], $repaired);
    }

    public function test_an_element_without_a_readable_field_and_an_extra_card_without_added_go(): void
    {
        $repaired = [];

        $out = resolve(ElementRepairer::class)->repair([
            'space.02' => ['text' => 'x'],
            'card.chance.17' => ['text' => 'x'],
            'card.chance.18' => ['added' => true, 'amount' => 9999, 'text' => 'Storm'],
            'nothing' => [],
            'space.03' => 'x',
        ], $repaired);

        self::assertSame(['card.chance.18' => ['added' => true, 'text' => 'Storm']], $out);
        self::assertSame([
            'elements.space.02.text: dropped',
            'elements.space.02: dropped',
            'elements.card.chance.17: dropped',
            'elements.card.chance.18.amount: dropped',
            'elements.nothing: dropped',
            'elements.space.03: dropped',
        ], $repaired);
    }
}
