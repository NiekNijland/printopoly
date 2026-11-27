<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintEditionReader;
use App\Modules\Print\Support\PrintHtmlBuilder;
use App\Modules\Print\ValueObjects\ExpectedPdf;
use Illuminate\Support\Facades\Vite;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class PrintHtmlBuilderTest extends TestCase
{
    public function test_the_page_carries_the_edition_its_photo_and_the_exact_page_size(): void
    {
        config(['printopoly.print.render_base_url' => 'http://render.test/', 'printopoly.print.page_height_shave_mm' => 0.05]);
        $edition = resolve(PrintEditionReader::class)->fromArray(PrintScenario::editionArray());

        $html = resolve(PrintHtmlBuilder::class)->build(
            PrintPart::BOARD,
            PrintSet::HOME,
            $edition,
            ['space.01#photo' => 'http://render.test/print/render/crop/molenweg.jpg'],
            new ExpectedPdf(pages: 7, widthMm: 210.0, heightMm: 296.95),
        );

        self::assertStringContainsString('<html lang="nl">', $html);
        self::assertStringContainsString('<title>Zaterdagclub</title>', $html);
        self::assertStringContainsString('<base href="http://render.test/">', $html);
        self::assertStringContainsString('@page { size: 210mm 296.95mm; margin: 0; }', $html);
        self::assertStringContainsString('<body data-part="board" data-set="home">', $html);

        $payload = $this->payload($html);
        self::assertSame('board', $payload['part']);
        self::assertSame('home', $payload['set']);
        self::assertSame('http://render.test', $payload['assetBase']);
        self::assertSame(0.05, $payload['pageShaveMm']);
        $printed = $payload['edition'];
        self::assertIsArray($printed);
        self::assertSame('Zaterdagclub', $printed['name']);
        self::assertSame('http://render.test/print/render/crop/molenweg.jpg', $this->photoSource($printed));
    }

    public function test_only_the_own_origin_may_load_and_the_script_carries_the_nonce_of_the_policy(): void
    {
        config(['printopoly.print.render_base_url' => 'http://render.test']);
        $edition = resolve(PrintEditionReader::class)->fromArray(PrintScenario::editionArray());

        $html = resolve(PrintHtmlBuilder::class)->build(PrintPart::CARDS, PrintSet::PRINTER, $edition, [], new ExpectedPdf(pages: null, widthMm: 69.0, heightMm: 94.0));

        self::assertSame(1, preg_match('/<script nonce="([A-Za-z0-9]{32})">/', $html, $match));
        $nonce = $match[1] ?? '';
        self::assertStringContainsString(
            'content="default-src &#039;none&#039;; script-src http://render.test &#039;nonce-' . $nonce . '&#039;; style-src http://render.test &#039;unsafe-inline&#039;; img-src http://render.test data:; font-src http://render.test data:"',
            $html,
        );
        self::assertSame($nonce, Vite::cspNonce());
        self::assertStringContainsString('@page { size: 69mm 94mm; margin: 0; }', $html);
    }

    public function test_the_policy_allows_only_the_own_origin_and_the_one_script_nonce(): void
    {
        self::assertSame(
            "default-src 'none'; script-src http://render.test 'nonce-abc'; style-src http://render.test 'unsafe-inline'; img-src http://render.test data:; font-src http://render.test data:",
            PrintHtmlBuilder::contentSecurityPolicy('http://render.test', 'abc'),
        );
    }

    public function test_a_page_without_a_name_is_called_printopoly_and_an_english_edition_speaks_english(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray([...PrintScenario::editionArray(name: '   '), 'language' => 'en']);

        $html = resolve(PrintHtmlBuilder::class)->build(PrintPart::MONEY, PrintSet::HOME, $edition, [], new ExpectedPdf(pages: 2, widthMm: 210.0, heightMm: 297.0));

        self::assertStringContainsString('<html lang="en">', $html);
        self::assertStringContainsString('<title>Printopoly</title>', $html);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(string $html): array
    {
        self::assertSame(1, preg_match("/window\\.__PRINT__ = JSON\\.parse\\('(.*?)'\\);/", $html, $match));
        $json = json_decode('"' . ($match[1] ?? '') . '"', true, 512, JSON_THROW_ON_ERROR);
        self::assertIsString($json);
        $payload = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        return array_combine(array_map(strval(...), array_keys($payload)), $payload);
    }

    /**
     * @param array<mixed> $edition
     */
    private function photoSource(array $edition): mixed
    {
        $elements = $edition['elements'] ?? null;
        self::assertIsArray($elements);
        $space = $elements['space.01'] ?? null;
        self::assertIsArray($space);
        $photo = $space['photo'] ?? null;
        self::assertIsArray($photo);

        return $photo['src'] ?? null;
    }
}
