<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Support\PrintEditionData;
use Tests\TestCase;

final class CardsKeepSpaceNamesTest extends TestCase
{
    private function edition(): PrintEditionData
    {
        return PrintEditionData::fromArray(['elements' => [
            'space.01' => ['name' => 'Raalterwetering', 'photo' => ['id' => 'x']],
            'space.03' => ['layout' => 'text'],
            'deed.02' => ['name' => 'Eigen akte'],
            'group.brown' => ['town' => 'Zwolle'],
        ]]);
    }

    public function test_the_cards_part_gets_the_names_of_the_spaces_for_its_deeds(): void
    {
        $elements = $this->edition()->onlyFor(PrintPart::Cards)->elements;

        self::assertSame(['name' => 'Raalterwetering'], $elements['space.01']);
        self::assertArrayNotHasKey('space.03', $elements);
        self::assertArrayHasKey('deed.02', $elements);
    }

    public function test_the_board_and_the_cards_both_get_the_town_of_a_colour_group(): void
    {
        self::assertSame(['town' => 'Zwolle'], $this->edition()->onlyFor(PrintPart::Board)->elements['group.brown']);
        self::assertSame(['town' => 'Zwolle'], $this->edition()->onlyFor(PrintPart::Cards)->elements['group.brown']);
        self::assertArrayNotHasKey('group.brown', $this->edition()->onlyFor(PrintPart::Money)->elements);
    }

    public function test_the_other_parts_do_not_get_them(): void
    {
        self::assertArrayNotHasKey('space.01', $this->edition()->onlyFor(PrintPart::Money)->elements);
    }
}
