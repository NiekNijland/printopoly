<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintJob;
use App\Print\InstructionPdfBuilder;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * The card instructions name the exact number of cards of the edition, extra cards included (B135).
 */
final class CardInstructionTextTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    #[Test]
    public function a_standard_edition_prints_sixty_cards_in_both_sets(): void
    {
        $job = $this->createAnonymousJob();

        $printer = $this->text($job, Locale::Dutch, PrintSet::Printer);
        self::assertStringContainsString('Je print voor deze editie 60 kaarten van 63 × 88 mm nieuw', $printer);
        self::assertStringContainsString("- Kans: 16 kaarten\n", $printer);
        self::assertStringContainsString("- Algemeen Fonds: 16 kaarten\n", $printer);
        self::assertStringContainsString('- Eigendomsbewijzen: 28', $printer);
        self::assertStringNotContainsString('Huisregelskaart', $printer);
        self::assertStringContainsString('Aantal: 60 kaarten', $printer);
        self::assertStringNotContainsString('{', $printer, 'every placeholder is filled');

        $home = $this->text($job, Locale::Dutch, PrintSet::Home);
        self::assertStringContainsString("De PDF heeft 16 pagina's", $home);
        self::assertStringContainsString('daarna 7 vellen A4', $home);
        self::assertStringContainsString('pagina 3 tot en met 16', $home);
        self::assertStringNotContainsString('{', $home);
    }

    #[Test]
    public function extra_cards_and_the_house_rules_card_are_counted_per_deck_and_in_total(): void
    {
        $edition = $this->editionPayload('e1', [
            'parts' => ['board' => true, 'deeds' => true, 'cards' => true, 'houseRules' => true],
            'elements' => [
                'card.chance.17' => ['added' => true, 'text' => 'Je wint de pubquiz.'],
                'card.chance.18' => ['added' => true],
                'card.chance.19' => ['added' => true],
                'card.chest.17' => ['added' => true],
                'card.chest.18' => ['text' => 'no added flag, no card'],
            ],
        ]);
        $response = $this->postAnonymousJob($edition, []);
        $response->assertCreated();
        $job = PrintJob::query()->where('token', $response->json('token'))->firstOrFail();

        // 16 + 3 Chance, 16 + 1 Community Chest, 28 deeds and the house rules card: 65 cards, 8 sheets.
        $nl = $this->text($job, Locale::Dutch, PrintSet::Printer);
        self::assertStringContainsString('Je print voor deze editie 65 kaarten', $nl);
        self::assertStringContainsString('- Kans: 19 kaarten (16 standaard en 3 extra)', $nl);
        self::assertStringContainsString('- Algemeen Fonds: 17 kaarten (16 standaard en 1 extra)', $nl);
        self::assertStringContainsString('- Huisregelskaart: 1', $nl);
        self::assertStringContainsString('Aantal: 65 kaarten', $nl);

        $nlHome = $this->text($job, Locale::Dutch, PrintSet::Home);
        self::assertStringContainsString("De PDF heeft 18 pagina's", $nlHome);
        self::assertStringContainsString('daarna 8 vellen A4', $nlHome);
        self::assertStringContainsString('pagina 3 tot en met 18', $nlHome);

        $en = $this->text($job, Locale::English, PrintSet::Printer);
        self::assertStringContainsString('For this edition you print 65 new cards', $en);
        self::assertStringContainsString('- Chance: 19 cards (16 standard and 3 extra)', $en);
        self::assertStringContainsString('- Community Chest: 17 cards (16 standard and 1 extra)', $en);
        self::assertStringContainsString('- Title deeds: 28', $en);
        self::assertStringContainsString('- House rules card: 1', $en);
        self::assertStringContainsString('Quantity: 65 cards', $en);
        self::assertStringNotContainsString('{', $en);

        $enHome = $this->text($job, Locale::English, PrintSet::Home);
        self::assertStringContainsString('The PDF has 18 pages', $enHome);
        self::assertStringContainsString('then 8 sheets of A4', $enHome);
        self::assertStringContainsString('print pages 3 to 18', $enHome);
    }

    #[Test]
    public function without_the_decks_only_the_deeds_are_listed(): void
    {
        $edition = $this->editionPayload('e1', [
            'parts' => ['board' => true, 'deeds' => true, 'cards' => false],
            'elements' => ['card.chance.17' => ['added' => true]],
        ]);
        $response = $this->postAnonymousJob($edition, []);
        $response->assertCreated();
        $job = PrintJob::query()->where('token', $response->json('token'))->firstOrFail();

        $text = $this->text($job, Locale::Dutch, PrintSet::Printer);
        self::assertStringContainsString('28 kaarten', $text);
        self::assertStringNotContainsString('Kans:', $text);
        self::assertStringNotContainsString('Algemeen Fonds:', $text);
        self::assertStringContainsString('- Eigendomsbewijzen: 28', $text);
    }

    #[Test]
    public function the_generated_pdf_carries_the_numbers(): void
    {
        $job = $this->createAnonymousJob();

        $this->generate($job, 'printer', ['cards'])->assertOk();
        $html = collect($this->renderer->htmls)->last(fn (string $html): bool => str_contains($html, 'Eigendomsbewijzen: 28'));

        self::assertIsString($html, 'the instruction PDF was rendered from the filled text');
        self::assertStringContainsString('60 kaarten', $html);
    }

    private function text(PrintJob $job, Locale $locale, PrintSet $set): string
    {
        return resolve(InstructionPdfBuilder::class)->text($job, PrintPart::Cards, $locale, $set);
    }
}
