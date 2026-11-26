<?php

declare(strict_types=1);

namespace Tests\Support;

/**
 * The counted list of a guard (04-guards.md C5): today's findings, one sorted line each, committed beside the guards and
 * counted by a ratchet row so it cannot grow. A line is a finding without its line number (`path: message`), so code that
 * moves above a finding does not change the list. A finding that occurs twice is two lines.
 */
final readonly class CountedList
{
    /**
     * @param string $file the list file; a missing file is the empty list
     */
    public function __construct(
        private string $file,
    ) {
    }

    /**
     * @param list<string> $findings what the guard reports for the real tree
     * @return list<string> one line per difference: a finding the list lacks (new) and a line no finding matches (stale)
     */
    public function differences(array $findings): array
    {
        $listed = is_file($this->file) ? array_values(array_filter(explode("\n", (string) file_get_contents($this->file)), static fn (string $line): bool => $line !== '')) : [];
        $found = self::keys($findings);
        $messages = [];

        if ($listed !== self::sorted($listed)) {
            $messages[] = basename($this->file) . ' is not sorted: sort the lines (LC_ALL=C sort)';
        }

        foreach ($this->minus($found, $listed) as $new) {
            $messages[] = 'a new finding that is not in ' . basename($this->file) . ': ' . $new . '. Fix it: a line is never added to a counted list';
        }

        foreach ($this->minus($listed, $found) as $stale) {
            $messages[] = 'a line of ' . basename($this->file) . ' is no longer found: ' . $stale . '. It is fixed: remove the line';
        }

        return $messages;
    }

    /**
     * @param list<string> $findings
     * @return list<string> the findings as lines of a list: sorted, without line numbers
     */
    public static function keys(array $findings): array
    {
        return self::sorted(array_map(
            static fn (string $finding): string => (string) preg_replace(['/^([^:\s]+\.php):(?:line )?\d+: /', '/^([^:\s]+\.php): line \d+: /'], '$1: ', $finding),
            $findings,
        ));
    }

    /**
     * @param list<string> $lines
     * @return list<string>
     */
    private static function sorted(array $lines): array
    {
        usort($lines, strcmp(...));

        return $lines;
    }

    /**
     * @param list<string> $from
     * @param list<string> $without
     * @return list<string> every line of $from that $without does not hold as often (a multiset difference)
     */
    private function minus(array $from, array $without): array
    {
        $left = array_count_values($without);
        $rest = [];

        foreach ($from as $line) {
            if (($left[$line] ?? 0) > 0) {
                $left[$line]--;

                continue;
            }

            $rest[] = $line;
        }

        return $rest;
    }
}
