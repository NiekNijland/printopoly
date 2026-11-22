<?php

declare(strict_types=1);

namespace App\Print;

/**
 * Writes a TrimBox and a BleedBox into every page of a PDF from Chrome (B160), so a print shop knows where to cut
 * and how far the picture runs on. Chrome cannot set them, so the pages are rewritten in an incremental update:
 * the new page objects and a new cross-reference section go after the original bytes, which stay untouched.
 *
 * Chrome (Skia) writes every page as a plain dictionary and a classic `xref` table. A PDF in another shape
 * (object streams, an xref stream) is returned as it came: the boxes are a help to the print shop, not a
 * reason to fail the part.
 */
final class PdfBoxes
{
    private const float MM_TO_POINTS = 72 / 25.4;

    /**
     * The boxes are measured from the top left corner of the page, with the size the page was meant to have. Chrome
     * rounds a page to whole pixels and the page is shaved a little to keep a blank page out (B63), so insetting
     * the MediaBox on all four sides gave a card of 63.11 × 87.84 mm (bug 40 of test round 4). The picture is laid
     * out from the top left, so that corner is exact.
     *
     * @param float $bleedInsetMm Distance from the edge of the page to the bleed box on every side.
     * @param float $trimInsetMm Distance from the edge of the page to the trim box on every side.
     * @param float|null $pageWidthMm The width the page was meant to have; null takes the MediaBox.
     * @param float|null $pageHeightMm The height the page was meant to have; null takes the MediaBox.
     */
    public static function apply(string $pdf, float $bleedInsetMm, float $trimInsetMm, ?float $pageWidthMm = null, ?float $pageHeightMm = null): string
    {
        if (preg_match_all('/(?:^|[\r\n])(\d+) 0 obj\s*<<\s*\/Type\s*\/Page(?![a-zA-Z])/', $pdf, $starts, PREG_OFFSET_CAPTURE) === 0) {
            return $pdf;
        }

        $trailer = self::trailer($pdf);

        if ($trailer === null) {
            return $pdf;
        }

        $update = '';
        $offsets = [];
        $base = strlen($pdf) + 1;

        foreach ($starts[1] as [$number, $position]) {
            $end = strpos($pdf, 'endobj', $position);

            if ($end === false) {
                return $pdf;
            }

            $object = substr($pdf, $position, $end - $position);

            if (str_contains($object, 'stream') || str_contains($object, '/TrimBox')) {
                return $pdf;
            }

            $box = self::mediaBox($object);

            if ($box === null) {
                return $pdf;
            }

            $boxes = sprintf(
                '/TrimBox %s /BleedBox %s ',
                self::inset($box, $trimInsetMm, $pageWidthMm, $pageHeightMm),
                self::inset($box, $bleedInsetMm, $pageWidthMm, $pageHeightMm),
            );
            $open = strpos($object, '<<');

            if ($open === false) {
                return $pdf;
            }

            $offsets[(int) $number] = $base + strlen($update);
            $update .= substr($object, 0, $open + 2) . $boxes . substr($object, $open + 2) . "endobj\n";
        }

        ksort($offsets);
        $xref = $base + strlen($update);
        $update .= "xref\n";

        foreach ($offsets as $number => $offset) {
            $update .= sprintf("%d 1\n%010d 00000 n \n", $number, $offset);
        }

        $update .= sprintf("trailer\n<<%s /Prev %d>>\nstartxref\n%d\n%%%%EOF\n", $trailer['dictionary'], $trailer['startxref'], $xref);

        return $pdf . "\n" . $update;
    }

    /**
     * The last trailer: its dictionary without `/Prev`, and where its cross-reference table starts.
     *
     * @return array{dictionary: string, startxref: int}|null
     */
    private static function trailer(string $pdf): ?array
    {
        if (preg_match_all('/trailer\s*<<(.*?)>>\s*startxref\s*(\d+)\s*%%EOF/s', $pdf, $matches, PREG_SET_ORDER) === 0) {
            return null;
        }

        $last = $matches[count($matches) - 1];
        $dictionary = (string) preg_replace('/\/Prev\s+\d+/', '', $last[1]);

        // Only a classic table can be continued this way.
        $start = (int) $last[2];

        if (substr($pdf, $start, 4) !== 'xref') {
            return null;
        }

        return ['dictionary' => ' ' . trim($dictionary), 'startxref' => $start];
    }

    /**
     * @return array{float, float, float, float}|null
     */
    private static function mediaBox(string $object): ?array
    {
        $number = '(-?[\d.]+)';

        if (preg_match('/\/MediaBox\s*\[\s*' . $number . '\s+' . $number . '\s+' . $number . '\s+' . $number . '\s*\]/', $object, $match) !== 1) {
            return null;
        }

        return [(float) $match[1], (float) $match[2], (float) $match[3], (float) $match[4]];
    }

    /**
     * A box `$mm` inside the page, from its top left corner, as wide and high as the intended page allows.
     *
     * @param array{float, float, float, float} $box
     */
    private static function inset(array $box, float $mm, ?float $pageWidthMm, ?float $pageHeightMm): string
    {
        $points = $mm * self::MM_TO_POINTS;
        $width = $pageWidthMm === null ? $box[2] - $box[0] - 2 * $points : ($pageWidthMm - 2 * $mm) * self::MM_TO_POINTS;
        $height = $pageHeightMm === null ? $box[3] - $box[1] - 2 * $points : ($pageHeightMm - 2 * $mm) * self::MM_TO_POINTS;
        $left = $box[0] + $points;
        $top = $box[3] - $points;

        return sprintf('[%.3F %.3F %.3F %.3F]', $left, $top - $height, $left + $width, $top);
    }
}
