<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Support\PartText;
use Tests\TestCase;

final class PartTextTest extends TestCase
{
    private const string DUTCH = "---\ntitle: Bord\n---\n\n# Bord\n\nIntro over {panels} panelen.\n\n## Drukkerij-set\n\nBestel bij de drukkerij.\n\n## Thuisprint-set\n\nPrint thuis op A4.\n\n## Voor beide\n\nLaat de lijm drogen.\n\n## Bestelblad drukkerij\n\n| Product | Bord |\n\n## Bestelblad thuisprint\n\n| Papier | 120 g/m² |\n";

    private const string ENGLISH = "# Board\n\nIntro.\n\n## Print-shop set\n\nOrder at the shop.\n\n## Home-print set\n\nPrint at home.\n\n## Order sheet print shop\n\n| Product | Board |\n";

    public function test_the_text_of_a_part_is_read_in_the_language_of_the_site(): void
    {
        $parts = resolve(PartText::class);

        $dutch = $parts->markdown(PrintPart::Cards, Locale::Dutch);
        $english = $parts->markdown(PrintPart::Cards, Locale::English);

        self::assertStringStartsWith("---\n", $dutch);
        self::assertSame('Kaarten en eigendomsbewijzen', $parts->title($dutch));
        self::assertNotSame($dutch, $english);
    }

    public function test_a_part_without_its_text_file_fails_the_print(): void
    {
        $parts = resolve(PartText::class);
        app()->setBasePath(sys_get_temp_dir());

        $this->expectException(PrintFailedException::class);
        $this->expectExceptionMessage('Instruction text not found: ' . sys_get_temp_dir() . '/resources/content/nl/instructies/bord.md');

        $parts->markdown(PrintPart::Board, Locale::Dutch);
    }

    public function test_the_print_shop_text_leaves_out_the_home_section_and_the_order_sheets(): void
    {
        $text = resolve(PartText::class)->forSet(self::DUTCH, PrintSet::Printer);

        self::assertSame("---\ntitle: Bord\n---\n\n# Bord\n\nIntro over {panels} panelen.\n\n## Drukkerij-set\n\nBestel bij de drukkerij.\n\n## Voor beide\n\nLaat de lijm drogen.\n\n", $text);
    }

    public function test_the_home_text_leaves_out_the_print_shop_section_in_english_too(): void
    {
        $text = resolve(PartText::class)->forSet(self::ENGLISH, PrintSet::Home);

        self::assertSame("# Board\n\nIntro.\n\n## Home-print set\n\nPrint at home.\n\n", $text);
    }

    public function test_the_order_sheet_takes_the_table_of_its_own_set_without_the_heading(): void
    {
        $parts = resolve(PartText::class);

        self::assertSame("| Product | Bord |\n", $parts->orderSheet(self::DUTCH, PrintSet::Printer));
        self::assertSame("| Papier | 120 g/m² |\n", $parts->orderSheet(self::DUTCH, PrintSet::Home));
        self::assertSame("| Product | Board |\n", $parts->orderSheet(self::ENGLISH, PrintSet::Printer));
    }

    public function test_a_part_without_specs_for_a_set_has_an_empty_order_sheet(): void
    {
        $parts = resolve(PartText::class);

        self::assertSame('', $parts->orderSheet(self::ENGLISH, PrintSet::Home));
        self::assertSame('', $parts->orderSheet("# Proefvel\n\nPrint dit vel eerst.\n", PrintSet::Printer));
    }

    public function test_a_text_without_a_title_has_an_empty_title(): void
    {
        self::assertSame('', resolve(PartText::class)->title("Alleen tekst.\n\n## Drukkerij-set\n"));
    }

    public function test_in_the_guide_the_part_is_a_section_with_an_anchor_and_every_set_is_filled_for_itself(): void
    {
        $seen = [];
        $guide = resolve(PartText::class)->forGuide(self::DUTCH, PrintPart::Board, static function (string $section, PrintSet $set) use (&$seen): string {
            $seen[] = $set->value;

            return str_replace('{panels}', $set === PrintSet::Printer ? '4' : '8', $section);
        });

        self::assertSame(['home', 'printer', 'home', 'home'], $seen);
        self::assertSame(
            "\n## Bord {#part-board}\n\nIntro over 8 panelen.\n\n### Drukkerij-set\n\nBestel bij de drukkerij.\n\n### Thuisprint-set\n\nPrint thuis op A4.\n\n### Voor beide\n\nLaat de lijm drogen.\n\n",
            $guide,
        );
    }
}
