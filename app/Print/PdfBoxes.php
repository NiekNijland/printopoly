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
     * @param float $bleedInsetMm Distance from the edge of the page to the bleed box on every side.
     * @param float $trimInsetMm Distance from the edge of the page to the trim box on every side.
     */
    public static function apply(string $pdf, float $bleedInsetMm, float $trimInsetMm): string
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
                self::inset($box, $trimInsetMm),
                self::inset($box, $bleedInsetMm),
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
     * @param array{float, float, float, float} $box
     */
    private static function inset(array $box, float $mm): string
    {
        $points = $mm * self::MM_TO_POINTS;

        return sprintf(
            '[%.3F %.3F %.3F %.3F]',
            $box[0] + $points,
            $box[1] + $points,
            $box[2] - $points,
            $box[3] - $points,
        );
    }
}
