<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Support\PrintEditionReader;
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
        self::assertTrue(PrintPart::BOARD->ownsElement('group.red'));
        self::assertTrue(PrintPart::CARDS->ownsElement('group.red'));
        self::assertFalse(PrintPart::MONEY->ownsElement('group.red'));
    }

    public function test_the_style_of_a_part_outdates_the_parts_that_draw_it(): void
    {
        // B268: the board style is drawn on the board, the lid, the invitation and the test sheet.
        foreach ([PrintPart::BOARD, PrintPart::BOX_LID, PrintPart::INVITATION, PrintPart::CALIBRATION] as $part) {
            self::assertTrue($part->ownsElement('style.board'), $part->value);
        }

        self::assertFalse(PrintPart::MONEY->ownsElement('style.board'));
        self::assertFalse(PrintPart::CARDS->ownsElement('style.board'));
        self::assertTrue(PrintPart::CARDS->ownsElement('style.cards'));
        self::assertTrue(PrintPart::CARDS->ownsElement('style.deeds'));
        self::assertTrue(PrintPart::MONEY->ownsElement('style.money'));
        self::assertTrue(PrintPart::TOKENS->ownsElement('style.pawns'));
        self::assertTrue(PrintPart::BOX_LID->ownsElement('style.box_lid'));
        self::assertFalse(PrintPart::BOARD->ownsElement('style.box_lid'));
    }

    public function test_the_lid_shows_the_board_so_the_board_outdates_it(): void
    {
        // A lid without an own photo shows the real board (B256).
        self::assertTrue(PrintPart::BOX_LID->ownsElement('box_lid'));
        self::assertTrue(PrintPart::BOX_LID->ownsElement('space.01'));
        self::assertTrue(PrintPart::BOX_LID->ownsElement('board_center'));
        self::assertTrue(PrintPart::BOX_LID->ownsElement('group.red'));
        self::assertFalse(PrintPart::BOX_LID->ownsElement('note.100'));
    }

    public function test_a_card_back_photo_gets_its_own_target_on_the_cards_part(): void
    {
        $photo = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition = resolve(PrintEditionReader::class)->fromArray([
            'name' => 'Test',
            'elements' => ['card_back.chance' => ['photo' => $photo]],
        ])->withTargets(['card_back.chance#photo' => ['w' => 69, 'h' => 94]]);

        $cards = $edition->onlyFor(PrintPart::CARDS)->placements();

        self::assertCount(1, $cards);
        self::assertSame(94.0, $cards[0]->targetHeightMm);
        self::assertSame([], $edition->onlyFor(PrintPart::BOARD)->placements());
    }
}
