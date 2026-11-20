<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Enums\PrintPart;
use App\Print\PrintEditionData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class CardsKeepSpaceNamesTest extends TestCase
{
    private function edition(): PrintEditionData
    {
        return PrintEditionData::fromArray(['elements' => [
            'space.01' => ['name' => 'Raalterwetering', 'photo' => ['id' => 'x']],
            'space.03' => ['layout' => 'text'],
            'deed.02' => ['name' => 'Eigen akte'],
        ]]);
    }

    #[Test]
    public function the_cards_part_gets_the_names_of_the_spaces_for_its_deeds(): void
    {
        $elements = $this->edition()->onlyFor(PrintPart::Cards)->elements;

        self::assertSame(['name' => 'Raalterwetering'], $elements['space.01']);
        self::assertArrayNotHasKey('space.03', $elements);
        self::assertArrayHasKey('deed.02', $elements);
    }

    #[Test]
    public function the_other_parts_do_not_get_them(): void
    {
        self::assertArrayNotHasKey('space.01', $this->edition()->onlyFor(PrintPart::Money)->elements);
    }
}
