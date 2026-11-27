<?php

declare(strict_types=1);

namespace Tests\Support;

/**
 * Writes a minimal but valid PDF with blank pages of given sizes, so the PDF
 * check can be tested with the real `pdfinfo` without rendering anything.
 */
final class TestPdf
{
    /**
     * @param list<array{float, float}> $pagesMm Width and height of every page in mm.
     */
    public static function make(array $pagesMm): string
    {
        $objects = [];
        $kids = [];

        foreach ($pagesMm as $index => [$width, $height]) {
            $objectNumber = 3 + $index;
            $kids[] = $objectNumber . ' 0 R';
            $objects[$objectNumber] = sprintf(
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.3f %.3f] >>',
                $width / 25.4 * 72,
                $height / 25.4 * 72,
            );
        }

        $objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
        $objects[2] = sprintf('<< /Type /Pages /Kids [%s] /Count %d >>', implode(' ', $kids), count($pagesMm));
        ksort($objects);

        $pdf = "%PDF-1.4\n";
        $offsets = [];

        foreach ($objects as $number => $body) {
            $offsets[$number] = mb_strlen($pdf, encoding: '8bit');
            $pdf .= sprintf("%d 0 obj\n%s\nendobj\n", $number, $body);
        }

        $xref = mb_strlen($pdf, encoding: '8bit');
        $pdf .= sprintf("xref\n0 %d\n0000000000 65535 f \n", count($objects) + 1);

        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf . sprintf("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", count($objects) + 1, $xref);
    }

    /**
     * @return list<array{float, float}>
     */
    public static function pages(int $count, float $width, float $height): array
    {
        return array_fill(0, $count, [$width, $height]);
    }
}
