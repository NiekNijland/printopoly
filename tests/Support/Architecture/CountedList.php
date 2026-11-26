<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class CountedList
{
    /**
     * @param string $list the list file, relative to the root: one finding per line, sorted, read by a ratchet row that only lets it shrink
     */
    public function __construct(
        private string $root,
        private string $list,
    ) {
    }

    /**
     * @return list<string>
     */
    public function entries(): array
    {
        $path = $this->root . '/' . $this->list;

        if (! is_file($path)) {
            return [];
        }

        return array_values(array_filter(explode("\n", (string) file_get_contents($path)), static fn (string $line): bool => $line !== ''));
    }

    /**
     * @param list<string> $findings what the guard finds in the tree today
     * @param callable(list<string>): list<string> $explain the guard's message for each finding
     * @return list<string>
     */
    public function violations(array $findings, callable $explain): array
    {
        $entries = $this->entries();
        $sorted = array_values(array_unique($entries));
        sort($sorted, SORT_STRING);
        $violations = [];

        if ($sorted !== $entries) {
            $violations[] = $this->list . ' is not sorted or holds a line twice: one line per finding, in byte order (LC_ALL=C sort -u)';
        }

        foreach ($explain(array_values(array_diff($findings, $entries))) as $message) {
            $violations[] = $message . ' A new finding is fixed in the code, never added to the counted list ' . $this->list . '.';
        }

        foreach (array_diff($entries, $findings) as $stale) {
            $violations[] = $stale . ': on the counted list ' . $this->list . ' and no longer found. Delete the line: the list only shrinks.';
        }

        return $violations;
    }
}
