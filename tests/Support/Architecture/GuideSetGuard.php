<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Tests\Support\RecursiveFiles;

/**
 * The set of guides (03-conventions.md B2, catalog "Docs"): the guard list of the root guide and the rows files agree in both
 * directions, and every guide is a path of the ratchet row that counts transition words.
 */
final readonly class GuideSetGuard
{
    /**
     * @param string $guide the root guide with the guard list, relative to the root
     * @param list<string> $guardListHeader the header cells of the guard list: name in backticks, its rows file in backticks, what it decides
     * @param string $rowsFolder the folder of the rows files, one per guard, relative to the root
     * @param list<string> $sourceRoots the folders in which a nested guide may sit, relative to the root
     * @param string $nestedGuide the file name of a guide that sits in many folders
     * @param list<string> $otherGuides the guides that are not nested guides (the review rubric), relative to the root
     * @param string $ratchetScript the ratchet script, relative to the root
     * @param string $tenseRow the name of the ratchet row that counts transition words in the guides
     */
    public function __construct(
        private string $root,
        private string $guide,
        private array $guardListHeader,
        private string $rowsFolder,
        private array $sourceRoots,
        private string $nestedGuide,
        private array $otherGuides,
        private string $ratchetScript,
        private string $tenseRow,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        return [...$this->guardListViolations(), ...$this->tenseRowViolations()];
    }

    /**
     * @return list<string> every nested guide under the source roots and the root, with the other guides, sorted
     */
    public function guides(): array
    {
        $guides = $this->otherGuides;

        if (is_file($this->root . '/' . $this->nestedGuide)) {
            $guides[] = $this->nestedGuide;
        }

        foreach ($this->sourceRoots as $folder) {
            if (! is_dir($this->root . '/' . $folder)) {
                continue;
            }

            foreach (RecursiveFiles::in($this->root . '/' . $folder) as $file) {
                if ($file->getFilename() === $this->nestedGuide) {
                    $guides[] = substr($file->getPathname(), strlen($this->root) + 1);
                }
            }
        }

        $guides = array_values(array_unique($guides));
        sort($guides, SORT_STRING);

        return $guides;
    }

    /**
     * @return list<string>
     */
    private function guardListViolations(): array
    {
        $rows = GuideText::table(GuideText::of($this->root, $this->guide), $this->guardListHeader);
        $violations = [];
        $names = [];

        if ($rows === []) {
            return [$this->guide . ' has no guard list with the header ' . implode(' | ', $this->guardListHeader) . ': a row of the one-pattern table names its guard from that list'];
        }

        foreach ($rows as $row) {
            $name = GuideText::codeSpans($row[0])[0] ?? '';
            $expected = $this->rowsFolder . '/' . $name . '.md';

            if (in_array($name, $names, true)) {
                $violations[] = $this->guide . ': the guard ' . $name . ' stands twice on the guard list: keep one row per guard';
            }

            $names[] = $name;

            if (GuideText::codeSpans($row[1]) !== [$expected]) {
                $violations[] = $this->guide . ': the guard ' . $name . ' names its rows file as "' . $row[1] . '": write `' . $expected . '`';
            }

            if (! is_file($this->root . '/' . $expected)) {
                $violations[] = $this->guide . ': the guard ' . $name . ' has no rows file ' . $expected . ': a guard holds the words it reads in its own file';
            }
        }

        $files = glob($this->root . '/' . $this->rowsFolder . '/*.md');

        foreach ($files === false ? [] : $files as $file) {
            if (! in_array(basename($file, '.md'), $names, true)) {
                $violations[] = $this->rowsFolder . '/' . basename($file) . ' is on no row of the guard list of ' . $this->guide . ': add the guard to the list, or delete the file';
            }
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    private function tenseRowViolations(): array
    {
        $script = GuideText::of($this->root, $this->ratchetScript);

        if (preg_match('/^' . preg_quote($this->tenseRow, '/') . '\s+max\s+grep\s+(\S+)\s/m', $script, $row) !== 1) {
            return [$this->ratchetScript . ' has no row ' . $this->tenseRow . ' (max, grep) over the guides: add it with every guide as a path'];
        }

        $paths = array_map(static fn (string $path): string => rtrim($path, '?'), explode(',', $row[1]));
        $violations = [];

        foreach ($this->guides() as $guide) {
            if (! in_array($guide, $paths, true)) {
                $violations[] = $guide . ' is a guide that the row ' . $this->tenseRow . ' of ' . $this->ratchetScript . ' does not count: add it to the paths of the row';
            }
        }

        return $violations;
    }
}
