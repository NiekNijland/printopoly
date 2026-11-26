<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\PrintPart;
use App\Print\PrintEditionData;
use Tests\TestCase;

final class StyleElementsTest extends TestCase
{
    public function test_the_accent_is_drawn_on_every_part(): void
    {
        foreach (PrintPart::production() as $part) {
            self::assertTrue($part->ownsElement('theme_accent'), $part->value);
        }
    }

    public function test_a_group_colour_outdates_the_board_and_the_deeds_but_not_the_money(): void
    {
        self::assertTrue(PrintPart::Board->ownsElement('group.red'));
        self::assertTrue(PrintPart::Cards->ownsElement('group.red'));
        self::assertFalse(PrintPart::Money->ownsElement('group.red'));
    }

    public function test_the_style_of_a_part_outdates_the_parts_that_draw_it(): void
    {
        // B268: the board style is drawn on the board, the lid, the invitation and the test sheet.
        foreach ([PrintPart::Board, PrintPart::BoxLid, PrintPart::Invitation, PrintPart::Calibration] as $part) {
            self::assertTrue($part->ownsElement('style.board'), $part->value);
        }

        self::assertFalse(PrintPart::Money->ownsElement('style.board'));
        self::assertFalse(PrintPart::Cards->ownsElement('style.board'));
        self::assertTrue(PrintPart::Cards->ownsElement('style.cards'));
        self::assertTrue(PrintPart::Cards->ownsElement('style.deeds'));
        self::assertTrue(PrintPart::Money->ownsElement('style.money'));
        self::assertTrue(PrintPart::Tokens->ownsElement('style.pawns'));
        self::assertTrue(PrintPart::BoxLid->ownsElement('style.box_lid'));
        self::assertFalse(PrintPart::Board->ownsElement('style.box_lid'));
    }

    public function test_the_lid_shows_the_board_so_the_board_outdates_it(): void
    {
        // A lid without an own photo shows the real board (B256).
        self::assertTrue(PrintPart::BoxLid->ownsElement('box_lid'));
        self::assertTrue(PrintPart::BoxLid->ownsElement('space.01'));
        self::assertTrue(PrintPart::BoxLid->ownsElement('board_center'));
        self::assertTrue(PrintPart::BoxLid->ownsElement('group.red'));
        self::assertFalse(PrintPart::BoxLid->ownsElement('note.100'));
    }

    public function test_a_card_back_photo_gets_its_own_target_on_the_cards_part(): void
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
