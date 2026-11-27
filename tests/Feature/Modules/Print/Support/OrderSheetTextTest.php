<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Support\OrderSheetText;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class OrderSheetTextTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_print_shop_sheet_lists_the_finished_parts_in_the_set_numbered_like_the_zip(): void
    {
        $job = PrintJob::factory()->create([
            'edition' => PrintScenario::editionArray(),
            'states' => [
                'printer_board' => ['status' => 'done'],
                'printer_cards' => ['status' => 'done'],
                'printer_money' => ['status' => 'done'],
                'printer_tokens' => ['status' => 'done'],
                'printer_box_lid' => ['status' => 'failed'],
                'printer_calibration' => ['status' => 'done'],
                'home_invitation' => ['status' => 'done'],
            ],
            'choices' => ['printer' => ['skipped' => ['money']]],
        ]);

        $text = resolve(OrderSheetText::class)->text($job, PrintSet::Printer, Locale::Dutch);

        self::assertStringStartsWith("---\ntitle: Bestelblad\n", $text);
        self::assertStringContainsString("# Bestelblad: Zaterdagclub\n", $text);
        self::assertStringNotContainsString('{if:copies_many}', $text);
        self::assertStringNotContainsString('Aantal sets', $text);
        self::assertSame(
            ['Bord (zaterdagclub-01-bord.pdf)', 'Kaarten en eigendomsbewijzen (zaterdagclub-02-kaarten-en-eigendomsbewijzen.pdf)', 'Pionnen (zaterdagclub-03-pionnen.pdf)'],
            $this->partHeadings($text),
        );
        self::assertStringContainsString('| Aantal                                                | 4 stuks, elk een eigen pagina ', $text);
        self::assertStringContainsString('| Paginamaat PDF    | 266 × 266 mm, met snijtekens', $text);
        self::assertStringContainsString("| Aantal           | 60 kaarten, 120 pagina's", $text);
        self::assertStringNotContainsString('{', $text);
    }

    public function test_the_home_sheet_for_more_sets_says_the_number_per_set_and_in_all(): void
    {
        $job = PrintJob::factory()->create([
            'edition' => PrintScenario::editionArray(),
            'states' => ['home_cards' => ['status' => 'done'], 'home_tokens' => ['status' => 'done']],
            'choices' => ['home' => ['copies' => 3]],
            'locale' => 'en',
        ]);

        $text = resolve(OrderSheetText::class)->text($job, PrintSet::Home, Locale::English);

        self::assertStringContainsString("# Order sheet: Zaterdagclub\n", $text);
        self::assertStringContainsString("\nNumber of sets: 3. The cards and the play money already hold every set in their PDF", $text);
        self::assertSame(['Cards and deeds (zaterdagclub-01-cards-and-deeds.pdf)', 'Pawns (zaterdagclub-02-pawns.pdf)'], $this->partHeadings($text));
        self::assertStringContainsString('| Quantity | 1 sheet of A4 per set, 3 in all', $text);
        self::assertStringContainsString('| Quantity | 44 pages of A4 portrait', $text);
    }

    public function test_a_sheet_without_finished_parts_has_only_its_top_and_an_edition_without_name_is_called_printopoly(): void
    {
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray('  '), 'states' => []]);

        $text = resolve(OrderSheetText::class)->text($job, PrintSet::Home, Locale::Dutch);

        self::assertStringContainsString("# Bestelblad: Printopoly\n", $text);
        self::assertSame([], $this->partHeadings($text));
    }

    public function test_a_missing_top_text_fails_the_sheet(): void
    {
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray()]);
        $sheet = resolve(OrderSheetText::class);
        app()->setBasePath(sys_get_temp_dir());

        $this->expectException(PrintFailedException::class);
        $this->expectExceptionMessage('Order sheet text not found: ' . sys_get_temp_dir() . '/resources/content/nl/instructies/bestelblad-drukkerij.md');

        $sheet->text($job, PrintSet::Printer, Locale::Dutch);
    }

    /**
     * @return list<string>
     */
    private function partHeadings(string $text): array
    {
        preg_match_all('/^## (.+)$/m', $text, $matches);

        return $matches[1];
    }
}
