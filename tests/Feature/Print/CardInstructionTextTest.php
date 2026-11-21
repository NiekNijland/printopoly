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
                'house_rules' => ['text' => 'Wie gooit, deelt.'],
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

    #[Test]
    public function the_instructions_use_the_words_of_the_edition(): void
    {
        // Bug 17 of test round 3: "Chance: 16 cards" and "Start at Go" in an edition with its own words.
        $edition = $this->editionPayload('e1', [
            'language' => 'en',
            'elements' => [
                'words.chance' => ['name' => 'Lucky Dip'],
                'words.chest' => ['name' => 'Kitty'],
                'words.house' => ['name' => 'tent', 'text' => 'tents'],
                'space.00' => ['name' => 'Base Camp'],
            ],
        ]);
        $job = PrintJob::query()->where('token', $this->postAnonymousJob($edition, [])->json('token'))->firstOrFail();

        $cards = $this->text($job, Locale::English, PrintSet::Printer);
        self::assertStringContainsString('- Lucky Dip: 16 cards', $cards);
        self::assertStringContainsString('- Kitty: 16 cards', $cards);
        self::assertStringNotContainsString('Chance', $cards);

        $board = $this->text($job, Locale::English, PrintSet::Home, PrintPart::Board);
        self::assertStringContainsString('Start at Base Camp.', $board);
        self::assertStringNotContainsString('{', $board);

        $fold = $this->text($job, Locale::English, PrintSet::Home, PrintPart::FoldModels);
        self::assertStringContainsString('32 tents and 12 hotels', $fold);
    }

    #[Test]
    public function the_board_instruction_names_the_panel_size_of_the_board_profile(): void
    {
        // Bug 22 of test round 3: it said 248 x 248 mm whatever the board was.
        $standard = $this->createAnonymousJob();
        self::assertStringContainsString('4 stuks, elk 248 × 248 mm, met 3 mm afloop erbij (254 × 254 mm)', $this->text($standard, Locale::Dutch, PrintSet::Printer, PrintPart::Board));

        $edition = $this->editionPayload('e1', [
            'boardProfile' => ['id' => 'own', 'name' => 'Eigen', 'outer' => 485, 'corner' => 66, 'border' => 0, 'panels' => 4, 'boxLid' => ['w' => 260, 'h' => 260]],
        ]);
        $job = PrintJob::query()->where('token', $this->postAnonymousJob($edition, [])->json('token'))->firstOrFail();

        $printer = $this->text($job, Locale::Dutch, PrintSet::Printer, PrintPart::Board);
        self::assertStringContainsString('4 stuks, elk 240,5 × 240,5 mm, met 3 mm afloop erbij (246,5 × 246,5 mm)', $printer);
        self::assertStringNotContainsString('248', $printer);

        // B158: the home set also explains the route on plain paper and cardboard of the size of the board.
        $home = $this->text($job, Locale::Dutch, PrintSet::Home, PrintPart::Board);
        self::assertStringContainsString('Zonder stickerpapier of zonder bord', $home);
        self::assertStringContainsString('karton van 485 × 485 mm', $home);
        self::assertStringNotContainsString('{', $home);
    }

    #[Test]
    public function the_money_instruction_follows_the_amount_chosen_for_the_set(): void
    {
        $job = $this->createAnonymousJob();

        $home = $this->text($job, Locale::Dutch, PrintSet::Home, PrintPart::Money);
        self::assertStringContainsString('144 biljetten, genoeg voor 2 tot 4 spelers', $home);
        self::assertStringContainsString('Aantal: 24 vellen A4', $home);

        $this->postJson(route('print.choices', ['printJob' => $job->token]), ['set' => 'home', 'moneyAmount' => 'eight'])->assertOk();
        $eight = $this->text($job->fresh() ?? $job, Locale::Dutch, PrintSet::Home, PrintPart::Money);
        self::assertStringContainsString('258 biljetten, genoeg voor 2 tot 8 spelers', $eight);
        self::assertStringContainsString('Aantal: 43 vellen A4', $eight);
        self::assertStringNotContainsString('{', $eight);
    }

    #[Test]
    public function with_more_sets_every_instruction_says_how_much_that_is_together(): void
    {
        // Sanne's class set: the instructions count with the number of sets.
        $job = $this->createAnonymousJob();
        $this->postJson(route('print.choices', ['printJob' => $job->token]), ['set' => 'home', 'copies' => 3])->assertOk();
        $job = $job->fresh() ?? $job;

        self::assertStringContainsString('Je maakt 3 sets.', $this->text($job, Locale::Dutch, PrintSet::Home, PrintPart::Money));
        self::assertStringContainsString('samen 72 vellen A4.', $this->text($job, Locale::Dutch, PrintSet::Home, PrintPart::Money));
        self::assertStringContainsString('samen 24 vellen A4.', $this->text($job, Locale::Dutch, PrintSet::Home, PrintPart::Cards));
        // The print-shop set keeps its own count.
        self::assertStringNotContainsString('sets.', $this->text($job, Locale::Dutch, PrintSet::Printer, PrintPart::Cards));
    }

    #[Test]
    public function the_money_instruction_names_the_start_money_in_the_edition_currency(): void
    {
        // Round 4: "Everyone starts with 1500" had no currency at all.
        $own = $this->editionPayload('e1', [
            'language' => 'en',
            'currency' => 'gbp',
            'parts' => ['board' => true, 'money' => true],
            'elements' => ['words.currency' => ['name' => 'Credits', 'text' => 'Cr']],
        ]);
        $job = PrintJob::query()->where('token', $this->postAnonymousJob($own, [])->json('token'))->firstOrFail();
        self::assertStringContainsString('Everyone starts with Cr1,500.', $this->text($job, Locale::English, PrintSet::Home, PrintPart::Money));

        $plain = $this->editionPayload('e2', ['parts' => ['board' => true, 'money' => true]]);
        $dutch = PrintJob::query()->where('token', $this->postAnonymousJob($plain, [])->json('token'))->firstOrFail();
        self::assertMatchesRegularExpression('/Iedereen begint met € 1\.500\./u', $this->text($dutch, Locale::Dutch, PrintSet::Home, PrintPart::Money));
    }

    private function text(PrintJob $job, Locale $locale, PrintSet $set, PrintPart $part = PrintPart::Cards): string
    {
        return resolve(InstructionPdfBuilder::class)->text($job, $part, $locale, $set);
    }
}
