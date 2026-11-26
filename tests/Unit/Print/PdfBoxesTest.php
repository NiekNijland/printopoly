<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Print\PdfBoxes;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\TestPdf;
use Tests\TestCase;

/**
 * B160: a print-shop PDF says where to cut (TrimBox) and how far the picture runs on (BleedBox). Read back with
 * the real `pdfinfo` (poppler-utils, installed in the Sail image).
 */
final class PdfBoxesTest extends TestCase
{
    private string $path = '';

    #[Override]
    protected function tearDown(): void
    {
        if ($this->path !== '' && is_file($this->path)) {
            File::delete($this->path);
        }

        parent::tearDown();
    }

    #[Test]
    public function every_page_gets_a_trim_box_and_a_bleed_box_inside_the_crop_mark_room(): void
    {
        // A card page: 63 x 88 mm, 3 mm bleed, 6 mm for the crop marks.
        $pdf = PdfBoxes::apply(TestPdf::make(TestPdf::pages(2, 81, 106)), 6, 9);
        $boxes = $this->boxes($pdf);

        self::assertCount(2, $boxes['TrimBox']);
        self::assertCount(2, $boxes['BleedBox']);

        foreach ($boxes['TrimBox'] as $trim) {
            self::assertEqualsWithDelta(63.0, $trim[2] - $trim[0], 0.05);
            self::assertEqualsWithDelta(88.0, $trim[3] - $trim[1], 0.05);
            self::assertEqualsWithDelta(9.0, $trim[0], 0.05);
        }

        foreach ($boxes['BleedBox'] as $bleed) {
            self::assertEqualsWithDelta(69.0, $bleed[2] - $bleed[0], 0.05);
            self::assertEqualsWithDelta(94.0, $bleed[3] - $bleed[1], 0.05);
        }

        // The original bytes stay in front: this is an incremental update.
        $original = TestPdf::make(TestPdf::pages(2, 81, 106));
        self::assertSame($original, substr($pdf, 0, strlen($original)));
    }

    /**
     * Bug 40 of test round 4: Chrome rounds the page to whole pixels and the page is shaved against a blank page,
     * so the card was 63.11 × 87.84 mm. The boxes follow the page as it was meant, from its top left corner.
     */
    #[Test]
    public function the_trim_box_is_exactly_the_card_on_a_rounded_and_shaved_page(): void
    {
        // 81.11 × 105.84 mm: what Chrome made of a page of 81 × 106 mm.
        $pdf = PdfBoxes::apply(TestPdf::make(TestPdf::pages(1, 81.11, 105.84)), 6, 9, 81, 106);
        $boxes = $this->boxes($pdf);
        $trim = $boxes['TrimBox'][0] ?? [0, 0, 0, 0];
        $bleed = $boxes['BleedBox'][0] ?? [0, 0, 0, 0];

        self::assertEqualsWithDelta(63.0, $trim[2] - $trim[0], 0.01);
        self::assertEqualsWithDelta(88.0, $trim[3] - $trim[1], 0.01);
        self::assertEqualsWithDelta(9.0, $trim[0], 0.01);
        // 9 mm under the top of the page, where the picture starts.
        self::assertEqualsWithDelta(105.84 - 9.0, $trim[3], 0.01);
        self::assertEqualsWithDelta(69.0, $bleed[2] - $bleed[0], 0.01);
        self::assertEqualsWithDelta(94.0, $bleed[3] - $bleed[1], 0.01);
    }

    #[Test]
    public function a_pdf_it_cannot_read_comes_back_unchanged(): void
    {
        self::assertSame('not a pdf', PdfBoxes::apply('not a pdf', 6, 9));
    }

    /**
     * The boxes per page in mm, as pdfinfo reads them.
     *
     * @return array<string, list<array{float, float, float, float}>>
     */
    private function boxes(string $pdf): array
    {
        $temporary = tempnam(sys_get_temp_dir(), 'boxes-');
        self::assertIsString($temporary);
        $this->path = $temporary;
        file_put_contents($this->path, $pdf);

        $result = Process::run(['pdfinfo', '-box', '-f', '1', '-l', '100', $this->path]);
        self::assertTrue($result->successful(), $result->errorOutput());
        // pdfinfo repairs a broken cross-reference table and says so; the update must read cleanly.
        self::assertStringNotContainsString('Error', $result->errorOutput());

        $boxes = ['TrimBox' => [], 'BleedBox' => []];
        preg_match_all('/^Page\s+\d+\s+(TrimBox|BleedBox):\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/m', $result->output(), $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $boxes[$match[1]][] = [
                (float) $match[2] * 25.4 / 72,
                (float) $match[3] * 25.4 / 72,
                (float) $match[4] * 25.4 / 72,
                (float) $match[5] * 25.4 / 72,
            ];
        }

        return $boxes;
    }
}
