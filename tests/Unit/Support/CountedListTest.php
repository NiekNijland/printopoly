<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use PHPUnit\Framework\TestCase;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

/**
 * The counted list every guard of this suite compares the real tree with (04-guards.md C5): a finding the list lacks fails,
 * a line no finding matches fails, an unsorted list fails; line numbers are not part of a line.
 */
final class CountedListTest extends TestCase
{
    public function test_it_fails_a_new_finding_a_stale_line_and_an_unsorted_list(): void
    {
        $root = SourceSandbox::create(['list.txt' => "b.php: two\na.php: one\n"]);

        try {
            $differences = new CountedList($root . '/list.txt')->differences(['a.php: line 4: one', 'c.php:12: three']);
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertSame([
            'list.txt is not sorted: sort the lines (LC_ALL=C sort)',
            'a new finding that is not in list.txt: c.php: three. Fix it: a line is never added to a counted list',
            'a line of list.txt is no longer found: b.php: two. It is fixed: remove the line',
        ], $differences);
    }

    public function test_it_counts_a_finding_that_occurs_twice_as_two_lines_and_reads_a_missing_file_as_empty(): void
    {
        $root = SourceSandbox::create(['list.txt' => "a.php: one\n"]);

        try {
            $twice = new CountedList($root . '/list.txt')->differences(['a.php:1: one', 'a.php:line 9: one']);
            $missing = new CountedList($root . '/none.txt')->differences([]);
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertSame(['a new finding that is not in list.txt: a.php: one. Fix it: a line is never added to a counted list'], $twice);
        self::assertSame([], $missing);
        self::assertSame(['a.php: one', 'b.php: two'], CountedList::keys(['b.php: line 3: two', 'a.php:7: one']));
    }
}
