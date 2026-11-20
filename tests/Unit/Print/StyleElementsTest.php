<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Enums\PrintPart;
use App\Print\PrintEditionData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class StyleElementsTest extends TestCase
{
    #[Test]
    public function the_accent_is_drawn_on_every_part(): void
    {
        foreach (PrintPart::production() as $part) {
            self::assertTrue($part->ownsElement('theme_accent'), $part->value);
        }
    }

    #[Test]
    public function a_group_colour_outdates_the_board_and_the_deeds_but_not_the_money(): void
    {
        self::assertTrue(PrintPart::Board->ownsElement('group.red'));
        self::assertTrue(PrintPart::Cards->ownsElement('group.red'));
        self::assertFalse(PrintPart::Money->ownsElement('group.red'));
    }

    #[Test]
    public function a_card_back_photo_gets_its_own_target_on_the_cards_part(): void
    {
        $photo = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition = PrintEditionData::fromArray([
            'name' => 'Test',
            'elements' => ['card_back.chance' => ['photo' => $photo]],
        ])->withTargets(['card_back.chance#photo' => ['w' => 69, 'h' => 94]]);

        $cards = $edition->onlyFor(PrintPart::Cards)->placements();

        self::assertCount(1, $cards);
        self::assertSame(94.0, $cards[0]->targetHeightMm);
        self::assertSame([], $edition->onlyFor(PrintPart::Board)->placements());
    }
}
