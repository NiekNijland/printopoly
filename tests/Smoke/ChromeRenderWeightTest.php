<?php

declare(strict_types=1);

namespace Tests\Smoke;

use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintPartBuilder;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Process;
use Override;
use PHPUnit\Framework\Attributes\Group;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\ChromeRender;

#[Group('smoke')]
#[Group('chrome')]
final class ChromeRenderWeightTest extends TestCase
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

    /**
     * Bug 3 of test round 4: the full bank for the print shop was 25 MB, too heavy for an upload form. The guilloche
     * is one picture per value now, which the PDF holds once.
     */
    public function test_the_full_bank_for_the_print_shop_stays_small(): void
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => []],
            'locale' => 'nl',
            'choices' => ['printer' => ['moneyAmount' => 'full']],
        ]);
        $job->save();

        $money = resolve(PrintPartBuilder::class)->build($job, PrintSet::PRINTER, PrintPart::MONEY);

        self::assertLessThan(6 * 1024 * 1024, $money->bytes);
        $images = Process::run(['pdfimages', '-list', ChromeRender::localPath($money)])->output();
        // One picture per value of note, written once and reused on every note.
        self::assertSame(7, count(array_unique(array_map(
            static fn (string $line): string => preg_split('/\s+/', trim($line))[10] ?? '',
            array_slice(array_filter(explode("\n", $images), static fn (string $line): bool => trim($line) !== ''), 2),
        ))));
    }

    /**
     * B270: the money styles keep the full bank as light as the theme's. Vintage draws its guilloche once per value as
     * a picture like the theme; Speels puts its polka dots in one, because a dash pattern becomes a shape per dot.
     */
    public function test_the_full_bank_stays_small_in_every_money_style(): void
    {
        foreach (['vintage' => 7, 'modern' => 0, 'playful' => 7] as $style => $pictures) {
            $job = new PrintJob([
                'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
                'user_id' => null,
                'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => ['style.money' => ['style' => $style]]],
                'locale' => 'nl',
                'choices' => ['printer' => ['moneyAmount' => 'full']],
            ]);
            $job->save();

            $money = resolve(PrintPartBuilder::class)->build($job, PrintSet::PRINTER, PrintPart::MONEY);

            self::assertLessThan(6 * 1024 * 1024, $money->bytes, $style);
            $images = Process::run(['pdfimages', '-list', ChromeRender::localPath($money)])->output();
            $objects = array_filter(array_map(
                static fn (string $line): string => preg_split('/\s+/', trim($line))[10] ?? '',
                array_slice(array_filter(explode("\n", $images), static fn (string $line): bool => trim($line) !== ''), 2),
            ), static fn (string $id): bool => $id !== '');
            self::assertCount($pictures, array_unique($objects), $style);
        }
    }

    /**
     * B269: a styled deck stays light. Vintage drew its guilloche as lines on every card (two home sets of cards were
     * 19 MB); its ornaments are one picture per kind now, the same on every card, which the PDF holds once. Speels
     * draws no dotted or dashed lines, which Chrome writes as a shape per dot. The pictures are a fixed part of the
     * file, so a bigger set comes closer to the theme.
     */
    public function test_the_cards_stay_small_in_every_card_and_deed_style(): void
    {
        foreach ([[PrintSet::PRINTER, 1, 120], [PrintSet::HOME, 2, 30]] as [$set, $copies, $pages]) {
            $theme = $this->cardsFor([], $set, $copies)->bytes;

            foreach (['vintage', 'playful'] as $style) {
                $cards = $this->cardsFor(['style.cards' => ['style' => $style], 'style.deeds' => ['style' => $style]], $set, $copies);

                fwrite(STDERR, sprintf("cards %s %s x%d: %d bytes (theme %d)\n", $set->value, $style, $copies, $cards->bytes, $theme));
                self::assertSame($pages, $cards->pages, $style);
                self::assertLessThan((int) ($theme * 1.5) + 1024 * 1024, $cards->bytes, $style);
            }
        }
    }

    /**
     * The cards for an edition with these elements.
     *
     * @param array<string, array<string, mixed>> $elements
     */
    private function cardsFor(array $elements, PrintSet $set, int $copies): PrintFile
    {
        $job = new PrintJob([
            'token' => 'chrome-test-token-' . bin2hex(random_bytes(8)),
            'user_id' => null,
            'edition' => ['name' => 'Chrome', 'language' => 'nl', 'elements' => $elements],
            'locale' => 'nl',
            'choices' => [$set->value => ['copies' => $copies]],
        ]);
        $job->save();

        return resolve(PrintPartBuilder::class)->build($job, $set, PrintPart::CARDS);
    }
}
