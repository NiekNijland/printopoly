<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class CountedList
{
    public function __construct(private string $file)
    {
    }

    /**
     * @return list<string> the entries of the list, one per line, in the order of the file
     */
    public function entries(): array
    {
        if (! is_file($this->file)) {
            return [];
        }

        return array_values(array_filter(explode("\n", (string) file_get_contents($this->file)), static fn (string $line): bool => $line !== ''));
    }

    /**
     * @param list<string> $found the findings of the guard over the real tree
     * @param callable(string): string $explain the rule and its fix for a finding
     * @return list<string> a new finding (not on the list) and a stale entry (on the list, no longer found), each once per surplus
     */
    public function compare(array $found, callable $explain): array
    {
        $listed = $this->entries();
        $messages = [];
        $sorted = $listed;
        sort($sorted, SORT_STRING);

        if ($sorted !== $listed) {
            $messages[] = $this->file . ' is not sorted: keep it sorted (LC_ALL=C sort), so a review reads every added line';
        }

        foreach ($this->surplus($found, $listed) as $entry) {
            $messages[] = 'new finding: ' . $explain($entry) . ' (fix it; the counted list ' . basename($this->file) . ' only shrinks, never add a line to it)';
        }

        foreach ($this->surplus($listed, $found) as $entry) {
            $messages[] = 'stale entry of ' . basename($this->file) . ': ' . $entry . ' (the finding is gone: delete the line)';
        }

        return $messages;
    }

    /**
     * @param list<string> $left
     * @param list<string> $right
     * @return list<string> every entry of $left that $right does not hold as often
     */
    private function surplus(array $left, array $right): array
    {
        $counts = array_count_values($right);
        $surplus = [];

        foreach ($left as $entry) {
            if (($counts[$entry] ?? 0) > 0) {
                $counts[$entry]--;

                continue;
            }

            $surplus[] = $entry;
        }

        return $surplus;
    }
}
