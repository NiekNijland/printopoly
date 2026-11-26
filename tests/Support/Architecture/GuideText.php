<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final class GuideText
{
    public static function of(string $root, string $guide): string
    {
        $path = $root . '/' . $guide;

        return is_file($path) ? (string) file_get_contents($path) : '';
    }

    /**
     * @param list<string> $header
     * @return list<list<string>> the rows of the first table with this header; the table ends at the first line that is not a row
     */
    public static function table(string $text, array $header): array
    {
        $rows = [];
        $inTable = false;

        foreach (explode("\n", $text) as $line) {
            if (! str_starts_with(trim($line), '|')) {
                if ($inTable) {
                    return $rows;
                }

                continue;
            }

            $cells = array_map(trim(...), explode('|', trim(trim($line), '|')));

            if (! $inTable) {
                $inTable = $cells === $header;

                continue;
            }

            if (count($cells) === count($header) && preg_match('/^[-: ]+$/', $cells[0]) !== 1) {
                $rows[] = $cells;
            }
        }

        return $rows;
    }

    /**
     * @return list<string> every name in backticks of the cell
     */
    public static function codeSpans(string $cell): array
    {
        preg_match_all('/`([^`]+)`/', $cell, $spans);

        return $spans[1];
    }
}
