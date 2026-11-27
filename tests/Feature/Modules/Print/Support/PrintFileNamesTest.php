<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class PrintFileNamesTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_names_carry_the_edition_and_speak_dutch_on_the_dutch_site(): void
    {
        $job = PrintJob::factory()->create(['edition' => ['name' => 'Riso Bedrijfsspel', 'language' => 'nl', 'elements' => []], 'locale' => 'nl']);

        $names = PrintFileNames::for($job, resolve(PrintJobContext::class));

        self::assertSame('riso-bedrijfsspel', $names->slug);
        self::assertSame(Locale::Dutch, $names->locale);
        self::assertSame('riso-bedrijfsspel-bord-drukkerij.pdf', $names->part(PrintPart::Board, PrintSet::Printer));
        self::assertSame('riso-bedrijfsspel-speelgeld-thuis.pdf', $names->part(PrintPart::Money, PrintSet::Home));
        self::assertSame('riso-bedrijfsspel-01-bord.pdf', $names->zipEntry(1, PrintPart::Board));
        self::assertSame('riso-bedrijfsspel-12-uitnodiging-1080px.png', $names->zipEntry(12, PrintPart::Invitation, 'png', '-1080px'));
        self::assertSame('instructies/03-speelgeld.pdf', $names->zipInstructions(3, PrintPart::Money));
        self::assertSame('riso-bedrijfsspel-instructies-kaarten-en-eigendomsbewijzen.pdf', $names->instructions(PrintPart::Cards));
        self::assertSame('riso-bedrijfsspel-00-bestelblad.pdf', $names->orderSheet());
        self::assertSame('riso-bedrijfsspel-uitnodiging-1080px.png', $names->image(PrintPart::Invitation, 1080));
        self::assertSame('riso-bedrijfsspel-drukkerij-set.zip', $names->zip(PrintSet::Printer));
        self::assertSame('riso-bedrijfsspel-thuisprint-set.zip', $names->zip(PrintSet::Home));
    }

    public function test_the_names_speak_english_on_the_english_site(): void
    {
        $job = PrintJob::factory()->create(['edition' => ['name' => 'Zaterdagclub', 'language' => 'nl', 'elements' => []], 'locale' => 'en']);

        $names = PrintFileNames::for($job, resolve(PrintJobContext::class));

        self::assertSame(Locale::English, $names->locale);
        self::assertSame('zaterdagclub-board-print-shop.pdf', $names->part(PrintPart::Board, PrintSet::Printer));
        self::assertSame('zaterdagclub-pawns-home.pdf', $names->part(PrintPart::Tokens, PrintSet::Home));
        self::assertSame('instructions/02-cards-and-deeds.pdf', $names->zipInstructions(2, PrintPart::Cards));
        self::assertSame('zaterdagclub-instructions-box-lid.pdf', $names->instructions(PrintPart::BoxLid));
        self::assertSame('zaterdagclub-00-order-sheet.pdf', $names->orderSheet());
        self::assertSame('zaterdagclub-print-shop-set.zip', $names->zip(PrintSet::Printer));
        self::assertSame('zaterdagclub-home-print-set.zip', $names->zip(PrintSet::Home));
    }

    public function test_a_site_language_the_names_do_not_know_falls_back_to_dutch(): void
    {
        $job = PrintJob::factory()->create(['edition' => ['name' => 'Zaterdagclub', 'language' => 'nl', 'elements' => []], 'locale' => 'de']);

        self::assertSame(Locale::Dutch, PrintFileNames::for($job, resolve(PrintJobContext::class))->locale);
    }

    public function test_a_job_whose_edition_is_gone_gets_the_name_of_the_site(): void
    {
        $job = PrintJob::factory()->create(['user_id' => 'user-zonder-editie', 'edition_id' => 'e-weg', 'edition' => null]);

        $names = PrintFileNames::for($job, resolve(PrintJobContext::class));

        self::assertSame('printopoly', $names->slug);
        self::assertSame('printopoly-00-bestelblad.pdf', $names->orderSheet());
    }

    public function test_a_slug_is_cut_at_forty_characters_without_a_dash_at_the_end(): void
    {
        self::assertSame('de-grote-jaarlijkse-verenigingsspelavond', PrintFileNames::slug('De Grote Jaarlijkse Verenigingsspelavond van Molenweg'));
        self::assertSame('cafe-de-molen', PrintFileNames::slug('Café de Molen!'));
        self::assertSame('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', PrintFileNames::slug(str_repeat('a', 39) . ' b'));
    }

    public function test_a_name_without_letters_or_digits_gives_the_name_of_the_site(): void
    {
        self::assertSame('printopoly', PrintFileNames::slug(''));
        self::assertSame('printopoly', PrintFileNames::slug('?! ...'));
    }
}
