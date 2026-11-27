<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

final readonly class CodeCloneGuard
{
    public const int WINDOW = 8;

    /**
     * @param list<string> $folders the folders to scan, relative to the root
     * @param list<string> $extensions the file extensions that count, without the dot
     * @param list<string> $skip regular expressions on the relative path of a file that does not count (tests, test helpers)
     * @param string $list the counted list, relative to the root
     */
    public function __construct(
        private string $root,
        private array $folders,
        private array $extensions,
        private array $skip,
        private string $list,
    ) {
    }

    /**
     * @return list<string> a counted-list line per group of repeated code: the hash of its first window and the files, sorted
     */
    public function findings(): array
    {
        return array_keys($this->groups());
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        return new CountedList($this->root, $this->list)->violations($this->findings(), $this->explain(...));
    }

    /**
     * @param list<string> $findings
     * @return list<string>
     */
    public function explain(array $findings): array
    {
        $groups = $this->groups();

        return array_map(static fn (string $finding): string => 'The same ' . self::WINDOW . ' or more lines stand in ' . implode(', ', $groups[$finding] ?? []) . ' (' . $finding . '): move them into one function or component that each file imports, so the logic has one definition.', $findings);
    }

    /**
     * @return list<array{int, string}> the line number and the normalized text of each line that counts
     */
    public static function normalizedLines(string $source): array
    {
        $lines = [];

        foreach (explode("\n", $source) as $index => $line) {
            $text = (string) preg_replace('/\s+/', ' ', mb_trim($line));

            if (preg_match('/[A-Za-z0-9]/', $text) === 1 && preg_match('~^(\/\/|/\*|\*|#(?!\[)|<\?php|import |use |namespace |declare\(|export (type )?\{|</[\w.]*>$)~', $text) !== 1) {
                $lines[] = [$index + 1, $text];
            }
        }

        return $lines;
    }

    /**
     * @return array<string, list<string>> the counted-list line of each group to its places (`path:first-last`)
     */
    private function groups(): array
    {
        $lines = [];
        $owners = [];

        foreach ($this->files() as $path) {
            $lines[$path] = self::normalizedLines((string) file_get_contents($this->root . '/' . $path));

            for ($index = 0; $index + self::WINDOW <= count($lines[$path]); $index++) {
                $owners[$this->hash(array_slice($lines[$path], $index, self::WINDOW))][$path][] = $index;
            }
        }

        $parents = [];

        foreach ($owners as $places) {
            if (count($places) > 1) {
                $this->join($parents, $places);
            }
        }

        $groups = [];

        foreach (array_keys($parents) as $node) {
            $groups[$this->root($parents, $node)][] = $node;
        }

        $found = [];

        foreach ($groups as $nodes) {
            [$key, $places] = $this->describe($nodes, $lines);
            $found[$key] = $places;
        }

        ksort($found, SORT_STRING);

        return $found;
    }

    /**
     * @param array<string, string> $parents
     * @param array<string, list<int>> $places the windows of one hash, per file
     */
    private function join(array &$parents, array $places): void
    {
        $first = null;

        foreach ($places as $path => $indexes) {
            foreach ($indexes as $index) {
                $node = $path . '#' . $index;
                $parents[$node] ??= $node;
                $first ??= $node;
                $parents[$this->root($parents, $node)] = $this->root($parents, $first);
                $previous = $path . '#' . ($index - 1);

                if (isset($parents[$previous])) {
                    $parents[$this->root($parents, $previous)] = $this->root($parents, $node);
                }

                $next = $path . '#' . ($index + 1);

                if (isset($parents[$next])) {
                    $parents[$this->root($parents, $next)] = $this->root($parents, $node);
                }
            }
        }
    }

    /**
     * @param array<string, string> $parents
     */
    private function root(array $parents, string $node): string
    {
        while ($parents[$node] !== $node) {
            $node = $parents[$node];
        }

        return $node;
    }

    /**
     * @param list<string> $nodes the windows of one group, as `path#index`
     * @param array<string, list<array{int, string}>> $lines
     * @return array{string, list<string>}
     */
    private function describe(array $nodes, array $lines): array
    {
        $indexes = [];

        foreach ($nodes as $node) {
            $at = (int) mb_strrpos($node, '#');
            $indexes[mb_substr($node, 0, $at)][] = (int) mb_substr($node, $at + 1);
        }

        ksort($indexes, SORT_STRING);
        $places = [];

        foreach ($indexes as $path => $windows) {
            $places[] = $path . ':' . $lines[$path][min($windows)][0] . '-' . $lines[$path][max($windows) + self::WINDOW - 1][0];
        }

        $first = (string) array_key_first($indexes);

        return [$this->hash(array_slice($lines[$first], min($indexes[$first]), self::WINDOW)) . ' ' . implode(' ', array_keys($indexes)), $places];
    }

    /**
     * @param list<array{int, string}> $window
     */
    private function hash(array $window): string
    {
        return mb_substr(hash('sha1', implode("\n", array_column($window, 1))), 0, 12);
    }

    /**
     * @return list<string> the relative path of every file that counts, sorted
     */
    private function files(): array
    {
        $paths = [];

        foreach ($this->folders as $folder) {
            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->root . '/' . $folder, RecursiveDirectoryIterator::SKIP_DOTS));

            foreach ($iterator as $file) {
                if ($file instanceof SplFileInfo && in_array($file->getExtension(), $this->extensions, true)) {
                    $paths[] = mb_substr($file->getPathname(), mb_strlen($this->root) + 1);
                }
            }
        }

        $paths = array_values(array_filter($paths, fn (string $path): bool => array_filter($this->skip, static fn (string $pattern): bool => preg_match($pattern, $path) === 1) === []));
        sort($paths, SORT_STRING);

        return $paths;
    }
}
