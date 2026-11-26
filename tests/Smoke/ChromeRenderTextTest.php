<?php

declare(strict_types=1);

namespace Tests\Smoke;

use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintPartBuilder;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase;
use Override;
use PHPUnit\Framework\Attributes\Group;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\ChromeRender;

#[Group('smoke')]
#[Group('chrome')]
final class ChromeRenderTextTest extends TestCase
{
    use RefreshesMongoDatabase;

    #[Override]
    public function createApplication(): Application
    {
        return ChromeRender::application();
    }

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        ChromeRender::prepare();
        $this->withVite();
    }

    public function test_the_printed_text_is_in_the_pdf(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => []],
            'locale' => 'nl',
        ]);
        $job->save();

        $file = resolve(PrintPartBuilder::class)->build($job, PrintSet::Home, PrintPart::Calibration);
        $path = ChromeRender::localPath($file);

        $text = (string) shell_exec('pdftotext ' . escapeshellarg($path) . ' - 2>/dev/null');
        self::assertStringContainsString('Proefvel', $text);
        self::assertStringContainsString('Liniaal 100 mm', $text);
    }

    /**
     * Round 4, bugs 2 to 4: the deeds, the price list, the salary and the tax in the PDFs follow the amounts of the
     * edition, and an extra card prints its amount as money.
     */
    public function test_the_amounts_of_an_edition_are_in_the_deeds_cards_and_booklet(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => [
                'name' => 'Zeven Zeeën',
                'language' => 'nl',
                'currency' => 'eur',
                'parts' => ['deeds' => true, 'cards' => true, 'rulesBooklet' => true],
                'elements' => [
                    'words.currency' => ['name' => 'Dukaat', 'text' => 'dk'],
                    'space.00' => ['amounts' => ['salary' => 240]],
                    'space.04' => ['amounts' => ['amount' => 180]],
                    'space.06' => ['name' => 'Kombuiskade', 'amounts' => ['rent.1' => 36, 'rent.5' => 600]],
                    'space.39' => ['name' => 'Kapiteinsbrug', 'amounts' => ['price' => 320]],
                    'card.chance.17' => ['added' => true, 'text' => 'Een storm! Betaal {amount} voor de reparatie.', 'amount' => -50],
                ],
            ],
            'locale' => 'nl',
        ]);
        $job->save();

        $builder = resolve(PrintPartBuilder::class);
        $text = fn (PrintPart $part): string => (string) preg_replace('/\s+/', ' ', (string) shell_exec(
            'pdftotext -raw ' . escapeshellarg(ChromeRender::localPath($builder->build($job, PrintSet::Printer, $part))) . ' - 2>/dev/null',
        ));

        $cards = $text(PrintPart::Cards);
        self::assertStringContainsString('Huur met 1 huis dk 36', $cards);
        self::assertStringContainsString('Huur met hotel dk 600', $cards);
        self::assertStringContainsString('Een storm! Betaal dk 50 voor de reparatie.', $cards);
        self::assertStringContainsString('Je krijgt dk 240 van de bank', $cards);

        $booklet = $text(PrintPart::RulesBooklet);
        self::assertStringContainsString('dk 240', $booklet);
        self::assertStringContainsString('dk 180', $booklet);
        self::assertStringContainsString('320', $booklet);
        self::assertStringNotContainsString('dk 200 van de bank', $booklet);
    }

    public function test_the_custom_words_of_an_edition_are_in_the_pdfs(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => [
                'name' => 'Raalte',
                'language' => 'nl',
                'currency' => 'eur',
                'parts' => ['deeds' => true, 'cards' => true, 'money' => true],
                'elements' => [
                    'words.house' => ['name' => 'Schuurtje', 'text' => 'Schuurtjes'],
                    'words.hotel' => ['name' => 'Boerderij', 'text' => 'Boerderijen'],
                    'words.jail' => ['name' => 'de Strafbank'],
                    'words.currency' => ['name' => 'Raalter pegels', 'text' => 'RP'],
                    'words.chance' => ['name' => 'Roddel'],
                    'words.chest' => ['name' => 'Dorpskas'],
                    'space.00' => ['name' => 'Begin', 'text' => 'Pak 200 pegels bij de molen'],
                    'space.10' => ['text' => 'In de Strafbank'],
                    'space.20' => ['text' => 'Even uitrusten'],
                    'space.30' => ['name' => 'Naar de Strafbank', 'text' => 'Rechtstreeks'],
                ],
            ],
            'locale' => 'nl',
        ]);
        $job->save();

        $builder = resolve(PrintPartBuilder::class);
        // Card texts wrap over lines; compare on one line.
        $text = fn (PrintPart $part): string => (string) preg_replace('/\s+/', ' ', (string) shell_exec(
            'pdftotext -raw ' . escapeshellarg(ChromeRender::localPath($builder->build($job, PrintSet::Printer, $part))) . ' - 2>/dev/null',
        ));

        // The board writes names in capitals and the corners on the diagonal (B266), where pdftotext reads letter by
        // letter: compare without case and spaces.
        $board = mb_strtolower((string) preg_replace('/\s+/', '', $text(PrintPart::Board)));
        $has = fn (string $needle): bool => str_contains($board, mb_strtolower((string) preg_replace('/\s+/', '', $needle)));
        self::assertTrue($has('Roddel'));
        self::assertTrue($has('Dorpskas'));
        self::assertTrue($has('RP 60'));
        self::assertTrue($has('Pak 200 pegels bij de molen'));
        self::assertTrue($has('Even uitrusten'));
        self::assertTrue($has('Rechtstreeks'));
        self::assertFalse($has('Kans'));
        self::assertFalse($has('Algemeen Fonds'));
        self::assertFalse($has('€'));

        $cards = $text(PrintPart::Cards);
        self::assertStringContainsString('Huur met 3 Schuurtjes', $cards);
        self::assertStringContainsString('Huur met Boerderij', $cards);
        self::assertStringContainsString('Kosten Schuurtje RP 50 per stuk', $cards);
        self::assertStringContainsString('betaal RP 25 per Schuurtje en RP 100 per Boerderij', $cards);
        self::assertStringContainsString('Ga meteen naar de Strafbank', $cards);
        self::assertStringContainsString('Roddel', $cards);
        self::assertStringContainsString('Dorpskas', $cards);
        self::assertStringContainsString('RP 60', $cards);
        self::assertStringNotContainsString('Kans', $cards);
        self::assertStringNotContainsString('huizen', $cards);

        $money = $text(PrintPart::Money);
        self::assertStringContainsString('RP 50', $money);
        // The bank on the note still says it is play money (B85); the own currency names the notes (B172).
        self::assertStringContainsStringIgnoringCase('speelgeld', $money);
        self::assertStringContainsString('Raalter pegels', $money);
        self::assertStringNotContainsString('€', $money);
    }
}
