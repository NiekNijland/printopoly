<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use SplFileInfo;
use Tests\Support\RecursiveFiles;

/**
 * The one-pattern table of the root guide (03-conventions.md B2, catalog "Docs"): every row names a guard of the guard list,
 * its example file exists and stands on no list, baseline or suppression file, and "lands with" stands in the Copy column only.
 */
final readonly class OnePatternTableGuard
{
    private const string LANDS_WITH = 'lands with';

    /**
     * @param string $guide the root guide that holds the one-pattern table and the guard list, relative to the root
     * @param list<string> $tableHeader the header cells of the one-pattern table: concern, the way, guard, example
     * @param list<string> $guardListHeader the header cells of the guard list; its first column names each guard in backticks
     * @param list<string> $guides every guide in which "lands with" may not stand outside the Copy column, relative to the root
     * @param list<string> $lists the list, baseline and suppression files and folders, relative to the root
     * @param string $ownList the counted list of this guard, which names example paths itself
     */
    public function __construct(
        private string $root,
        private string $guide,
        private array $tableHeader,
        private array $guardListHeader,
        private array $guides,
        private array $lists,
        private string $ownList,
    ) {
    }

    /**
     * @return list<string> the concern of every row of the one-pattern table
     */
    public function concerns(): array
    {
        return array_map(static fn (array $row): string => $row[0], $this->rows());
    }

    /**
     * @return list<string>
     */
    public function findings(): array
    {
        $rows = $this->rows();

        if ($rows === []) {
            return ['no-table ' . $this->guide];
        }

        $guards = $this->guardNames();
        $listLines = $this->listLines();
        $findings = [];

        foreach ($rows as [$concern, , $guardCell, $copy]) {
            $named = GuideText::codeSpans($guardCell);

            if ($named === []) {
                $findings[] = 'without-guard ' . $concern;
            }

            foreach (array_diff($named, $guards) as $unknown) {
                $findings[] = 'unknown-guard ' . $concern . ' ' . $unknown;
            }

            $findings = [...$findings, ...$this->exampleFindings($concern, $copy, $listLines)];
        }

        foreach ($this->guides as $guide) {
            $findings = [...$findings, ...$this->landsWithFindings($guide)];
        }

        sort($findings, SORT_STRING);

        return $findings;
    }

    /**
     * @param list<string> $findings
     * @return list<string>
     */
    public function explain(array $findings): array
    {
        return array_map(fn (string $finding): string => match (explode(' ', $finding)[0]) {
            'no-table' => $this->guide . ' has no one-pattern table with the header ' . implode(' | ', $this->tableHeader) . ': the guard reads its rows from it',
            'without-guard' => $finding . ': the row names no guard. Name the guard of the guard list that decides it, or build the guard first (03-conventions.md B2)',
            'unknown-guard' => $finding . ': the row names a guard that is not on the guard list of ' . $this->guide . '. Use a name of the list',
            'no-example' => $finding . ': the Copy column names no file that exists. Name the example file, or write "lands with <PR>" for an example of step 8',
            'example-on-list' => $finding . ': the example file stands on a list, baseline or suppression file, so it breaks a rule. Pick a file that passes every rule',
            default => $finding . ': "lands with" stands in the Copy column of the one-pattern table only. Name the guard, or write "review checks that, the guard does not (rubric item N)"',
        }, $findings);
    }

    /**
     * @return list<string> the names of the guard list, each in backticks in its first column
     */
    public function guardNames(): array
    {
        $names = [];

        foreach (GuideText::table(GuideText::of($this->root, $this->guide), $this->guardListHeader) as $row) {
            $names = [...$names, ...GuideText::codeSpans($row[0])];
        }

        return $names;
    }

    /**
     * @return list<list<string>>
     */
    private function rows(): array
    {
        return GuideText::table(GuideText::of($this->root, $this->guide), $this->tableHeader);
    }

    /**
     * @param array<string, list<string>> $listLines
     * @return list<string>
     */
    private function exampleFindings(string $concern, string $copy, array $listLines): array
    {
        $findings = [];
        $examples = array_values(array_filter(GuideText::codeSpans($copy), fn (string $span): bool => (str_contains($span, '/') || pathinfo($span, PATHINFO_EXTENSION) !== '') && file_exists($this->root . '/' . rtrim($span, '/'))));

        if ($examples === [] && ! str_contains(mb_strtolower($copy), self::LANDS_WITH)) {
            $findings[] = 'no-example ' . $concern;
        }

        foreach ($examples as $example) {
            foreach ($listLines as $list => $lines) {
                if (array_any($lines, static fn (string $line): bool => preg_match('~(^|[\s"\'])' . preg_quote($example, '~') . '($|[\s"\':])~', $line) === 1)) {
                    $findings[] = 'example-on-list ' . $concern . ' ' . $example . ' ' . $list;
                }
            }
        }

        return $findings;
    }

    /**
     * @return list<string>
     */
    private function landsWithFindings(string $guide): array
    {
        $findings = [];
        $copyCells = $guide === $this->guide ? array_map(static fn (array $row): string => $row[3], $this->rows()) : [];

        foreach (explode("\n", GuideText::of($this->root, $guide)) as $index => $line) {
            if (! str_contains(mb_strtolower($line), self::LANDS_WITH)) {
                continue;
            }

            $cells = array_map(trim(...), explode('|', trim(trim($line), '|')));
            $inCopy = count($cells) === count($this->tableHeader) && in_array($cells[3], $copyCells, true)
                && ! str_contains(mb_strtolower(implode('|', array_slice($cells, 0, 3))), self::LANDS_WITH);

            if (! $inCopy) {
                $findings[] = 'lands-with ' . $guide . ':' . ($index + 1);
            }
        }

        return $findings;
    }

    /**
     * @return array<string, list<string>> the lines of every list file, by its path relative to the root
     */
    private function listLines(): array
    {
        $lines = [];

        foreach ($this->lists as $list) {
            $path = $this->root . '/' . $list;
            $files = is_dir($path) ? array_map(static fn (SplFileInfo $file): string => $file->getPathname(), iterator_to_array(RecursiveFiles::in($path), false)) : (is_file($path) ? [$path] : []);

            foreach ($files as $file) {
                $relative = mb_substr($file, mb_strlen($this->root) + 1);

                if ($relative !== $this->ownList) {
                    $lines[$relative] = explode("\n", (string) file_get_contents($file));
                }
            }
        }

        ksort($lines);

        return $lines;
    }
}
