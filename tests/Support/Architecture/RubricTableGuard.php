<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * The review rubric against the one-pattern table (catalog "Docs", "Review rubric"): the rubric's table "what CI enforces,
 * what is review only" has every row of the one-pattern table in the same order, and each row names a guard or a numbered
 * finding of the rubric.
 */
final readonly class RubricTableGuard
{
    /**
     * @param string $guide the root guide with the one-pattern table, relative to the root
     * @param string $rubric the review rubric, relative to the root
     * @param list<string> $tableHeader the header cells of the one-pattern table
     * @param list<string> $rubricHeader the header cells of the rubric table: row, guard, review only
     */
    public function __construct(
        private string $root,
        private string $guide,
        private string $rubric,
        private array $tableHeader,
        private array $rubricHeader,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $rubricText = GuideText::of($this->root, $this->rubric);
        $concerns = array_map(static fn (array $row): string => $row[0], GuideText::table(GuideText::of($this->root, $this->guide), $this->tableHeader));
        $rows = GuideText::table($rubricText, $this->rubricHeader);
        $items = $this->itemNumbers($rubricText);
        $violations = [];

        if ($concerns === [] || $rows === []) {
            return [$this->guide . ' or ' . $this->rubric . ' has no table with its header: the guard compares the one-pattern table (' . implode(' | ', $this->tableHeader) . ') with the rubric table (' . implode(' | ', $this->rubricHeader) . ')'];
        }

        if ($items !== range(1, count($items))) {
            $violations[] = $this->rubric . ': the findings are not numbered 1 to ' . count($items) . ' without a gap: the catalogs cite them as "rubric item N"';
        }

        $rubricConcerns = array_map(static fn (array $row): string => $row[0], $rows);

        foreach (array_diff($concerns, $rubricConcerns) as $missing) {
            $violations[] = $this->rubric . ': the row "' . $missing . '" of the one-pattern table is missing: add it with its guard or its numbered review item';
        }

        foreach (array_diff($rubricConcerns, $concerns) as $extra) {
            $violations[] = $this->rubric . ': the row "' . $extra . '" is no row of the one-pattern table: rename it to the row of ' . $this->guide . ', or remove it';
        }

        if ($violations === [] && $rubricConcerns !== $concerns) {
            $violations[] = $this->rubric . ': the rows stand in another order than in the one-pattern table: keep the order of ' . $this->guide;
        }

        foreach ($rows as [$concern, $guard, $review]) {
            preg_match_all('/\bitem (\d+)/i', $review, $cited);
            $cited = array_map(intval(...), $cited[1]);

            if (trim($guard) === '' && $cited === []) {
                $violations[] = $this->rubric . ': the row "' . $concern . '" names no guard and no numbered review item: name the test, lint rule or script, or write "item N" in the review column';
            }

            foreach (array_diff($cited, $items) as $number) {
                $violations[] = $this->rubric . ': the row "' . $concern . '" cites item ' . $number . ', which the rubric does not have';
            }
        }

        return $violations;
    }

    /**
     * @return list<int> the numbers of the numbered findings, in their order
     */
    private function itemNumbers(string $markdown): array
    {
        preg_match_all('/^(\d+)\. /m', $markdown, $numbers);

        return array_map(intval(...), $numbers[1]);
    }
}
