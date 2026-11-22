<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\InstructionText;
use App\Print\PrintEditionData;
use App\Print\PrintLayout;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Print-shop findings of feedback round 6 (Ingrid, Sara, Aisha): conditions in table rows, the photo on the test
 * sheet, the booklet that counts the added cards and the booklet at A5 of 148 mm (B250, B253, B254).
 */
final class RoundSevenPrintShopTest extends TestCase
{
    private const array PHOTO = ['photoId' => 'p1', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

    #[Test]
    public function a_condition_in_the_first_cell_of_a_table_row_keeps_or_drops_the_row(): void
    {
        $edition = PrintEditionData::fromArray(['name' => 'Westerveen', 'elements' => []]);
        $markdown = "| | |\n| - | - |\n| {if:board_panels} | Aantal | {panels} stuks |\n| {if:board_whole}  | Aantal | 1 stuk |\n{if:board_panels}Losse regel";

        $text = resolve(InstructionText::class)->fill($markdown, PrintPart::Board, $edition, Locale::Dutch);

        self::assertStringContainsString("| Aantal | 4 stuks |\n", $text);
        self::assertStringNotContainsString('1 stuk', $text);
        self::assertStringNotContainsString('{if:', $text);
        self::assertStringContainsString("\nLosse regel", $text);
    }

    #[Test]
    public function the_test_sheet_keeps_the_photo_of_start_and_the_first_space(): void
    {
        $edition = PrintEditionData::fromArray(['name' => 'Anna & Pieter', 'elements' => [
            'space.01' => ['name' => 'Waar het allemaal begon', 'photo' => self::PHOTO, 'photoStyle' => 'full'],
            'space.03' => ['photo' => self::PHOTO],
        ]]);

        $elements = $edition->onlyFor(PrintPart::Calibration)->elements;

        self::assertSame(self::PHOTO, $elements['space.01']['photo'] ?? null);
        self::assertSame('full', $elements['space.01']['photoStyle'] ?? null);
        self::assertArrayNotHasKey('space.03', $elements);
    }

    #[Test]
    public function the_booklet_knows_the_added_cards(): void
    {
        $edition = PrintEditionData::fromArray(['name' => 'Kerst', 'elements' => [
            'card.chance.17' => ['text' => 'Een eigen kaart', 'added' => true],
        ]]);

        $elements = $edition->onlyFor(PrintPart::RulesBooklet)->elements;

        self::assertSame(['added' => true], $elements['card.chance.17'] ?? null);
    }

    #[Test]
    public function the_booklet_is_a5_of_148_mm_at_the_print_shop_and_a4_landscape_at_home(): void
    {
        $edition = PrintEditionData::fromArray(['name' => 'Boekje', 'elements' => []]);
        $bleed = config()->float('printopoly.print.bleed_mm');

        $shop = PrintLayout::expect(PrintPart::RulesBooklet, PrintSet::Printer, $edition);
        self::assertEqualsWithDelta(148 + 2 * ($bleed + PrintLayout::MARKS), $shop->widthMm, 0.001);

        $home = PrintLayout::expect(PrintPart::RulesBooklet, PrintSet::Home, $edition);
        self::assertEqualsWithDelta(297, $home->widthMm, 0.001);
        self::assertEqualsWithDelta(210, $home->heightMm, 0.001);
    }
}
