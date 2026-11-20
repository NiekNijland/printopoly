<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Print\ExpectedPdf;
use App\Print\PdfInspector;
use App\Print\PrintFailed;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestPdf;
use Tests\TestCase;

/**
 * Runs the real `pdfinfo` (poppler-utils, installed in the Sail image).
 */
final class PdfInspectorTest extends TestCase
{
    private string $path = '';

    #[Override]
    protected function tearDown(): void
    {
        if ($this->path !== '' && is_file($this->path)) {
            unlink($this->path);
        }

        parent::tearDown();
    }

    #[Test]
    public function it_reads_page_sizes_back_in_millimetres(): void
    {
        $this->write(TestPdf::make([[69.0, 94.0], [210.0, 297.0]]));

        $pages = new PdfInspector()->pages($this->path);

        self::assertCount(2, $pages);
        self::assertEqualsWithDelta(69.0, $pages[0][0], 0.05);
        self::assertEqualsWithDelta(297.0, $pages[1][1], 0.05);
    }

    #[Test]
    public function it_accepts_a_pdf_that_matches_within_0_2_mm(): void
    {
        $this->write(TestPdf::make(TestPdf::pages(3, 69.15, 94.0)));

        self::assertSame(3, new PdfInspector()->assertMatches($this->path, new ExpectedPdf(3, 69, 94)));
    }

    #[Test]
    public function it_fails_on_a_wrong_page_count(): void
    {
        $this->write(TestPdf::make(TestPdf::pages(3, 69, 94)));

        $this->expectException(PrintFailed::class);
        $this->expectExceptionMessage('3 pages, 4 expected');

        new PdfInspector()->assertMatches($this->path, new ExpectedPdf(4, 69, 94));
    }

    #[Test]
    public function it_fails_when_a_page_is_more_than_0_2_mm_off(): void
    {
        $this->write(TestPdf::make([[69.0, 94.0], [69.0, 94.5]]));

        $this->expectException(PrintFailed::class);
        $this->expectExceptionMessage('Page 2');

        new PdfInspector()->assertMatches($this->path, new ExpectedPdf(2, 69, 94));
    }

    #[Test]
    public function it_fails_on_a_file_that_is_not_a_pdf(): void
    {
        $this->write('this is not a pdf');

        $this->expectException(PrintFailed::class);

        new PdfInspector()->pages($this->path);
    }

    #[Test]
    public function instruction_pdfs_must_be_a4(): void
    {
        $this->write(TestPdf::make(TestPdf::pages(2, 210, 297)));
        self::assertSame(2, new PdfInspector()->assertA4($this->path));

        $this->write(TestPdf::make(TestPdf::pages(1, 215.9, 279.4)));
        $this->expectException(PrintFailed::class);
        new PdfInspector()->assertA4($this->path);
    }

    private function write(string $contents): void
    {
        $this->path = $this->path !== '' ? $this->path : (string) tempnam(sys_get_temp_dir(), 'inspector-test-');
        file_put_contents($this->path, $contents);
    }
}
