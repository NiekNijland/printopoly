<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CountedList;
use Tests\Support\SourceSandbox;

final class CountedListArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string|null, list<string>, string}>
     */
    public static function listsThatDoNotMatchTheFindings(): iterable
    {
        yield 'a new finding' => ["a\n", ['a', 'b'], 'b (explained) A new finding is fixed in the code, never added to the counted list lists/x.txt.'];
        yield 'a finding and no list file' => [null, ['a'], 'a (explained) A new finding'];
        yield 'a fixed finding' => ["a\nb\n", ['a'], 'b: on the counted list lists/x.txt and no longer found. Delete the line: the list only shrinks.'];
        yield 'an unsorted list' => ["b\na\n", ['a', 'b'], 'lists/x.txt is not sorted or holds a line twice'];
        yield 'a line twice' => ["a\na\n", ['a'], 'is not sorted or holds a line twice'];
        yield 'a list sorted by locale, not by byte' => ["a\nB\n", ['B', 'a'], 'in byte order'];
    }

    /**
     * @param list<string> $findings
     */
    #[Test]
    #[DataProvider('listsThatDoNotMatchTheFindings')]
    public function it_fails_a_new_finding_a_stale_line_and_a_list_out_of_order(?string $list, array $findings, string $words): void
    {
        self::assertStringContainsString($words, implode("\n", $this->compare($list, $findings)));
    }

    /**
     * @return iterable<string, array{string|null, list<string>}>
     */
    public static function listsThatMatch(): iterable
    {
        yield 'the same findings, sorted by byte' => ["B\na\n", ['a', 'B']];
        yield 'no findings and no list' => [null, []];
        yield 'no findings and an empty list' => ['', []];
        yield 'a list without a final line break' => ['a', ['a']];
    }

    /**
     * @param list<string> $findings
     */
    #[Test]
    #[DataProvider('listsThatMatch')]
    public function it_accepts_a_list_that_holds_exactly_the_findings(?string $list, array $findings): void
    {
        self::assertSame([], $this->compare($list, $findings));
    }

    /**
     * @param list<string> $findings
     * @return list<string>
     */
    private function compare(?string $list, array $findings): array
    {
        $root = SourceSandbox::create($list === null ? ['README' => ''] : ['lists/x.txt' => $list], prefix: '.checkout-');

        try {
            return new CountedList($root, 'lists/x.txt')->violations($findings, static fn (array $new): array => array_map(static fn (string $finding): string => $finding . ' (explained)', $new));
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
