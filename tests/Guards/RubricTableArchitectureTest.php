<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\RubricTableGuard;
use Tests\Support\SourceSandbox;

final class RubricTableArchitectureTest extends TestCase
{
    private const array TABLE = ['Taak', 'De ene manier', 'Guard', 'Kopieer'];

    private const array RUBRIC_TABLE = ['Rij', 'Guard', 'Alleen review'];

    private const string GUIDE = "| Taak | De ene manier | Guard | Kopieer |\n| --- | --- | --- | --- |\n| Model | casts() | `layout` | `app/Models/Edition.php` |\n| Route | één controller | `layout` | `routes/web.php` |\n";

    private const string ITEMS = "## Bevindingen\n\n1. Een lijst groeit.\n2. Een guard verdwijnt.\n3. Een id zonder policy.\n\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function rubricsThatDisagree(): iterable
    {
        yield 'a row of the one-pattern table that is missing' => [self::ITEMS . self::rubric(['| Model | `ModelConventionArchitectureTest` | |']), 'the row "Route" of the one-pattern table is missing'];
        yield 'a row that the one-pattern table does not have' => [self::ITEMS . self::rubric(['| Model | `ModelConventionArchitectureTest` | |', '| Route | `RouteDeclarationArchitectureTest` | |', '| Cache | `CacheTest` | |']), 'the row "Cache" is no row of the one-pattern table'];
        yield 'the rows in another order' => [self::ITEMS . self::rubric(['| Route | `RouteDeclarationArchitectureTest` | |', '| Model | `ModelConventionArchitectureTest` | |']), 'in another order'];
        yield 'a row with no guard and no item' => [self::ITEMS . self::rubric(['| Model | | met het oog |', '| Route | `RouteDeclarationArchitectureTest` | |']), 'the row "Model" names no guard and no numbered review item'];
        yield 'a row that cites an item the rubric does not have' => [self::ITEMS . self::rubric(['| Model | | item 7: de policy |', '| Route | `RouteDeclarationArchitectureTest` | |']), 'cites item 7, which the rubric does not have'];
        yield 'findings with a gap in the numbers' => ["1. Een lijst groeit.\n3. Een id zonder policy.\n\n" . self::rubric(['| Model | `ModelConventionArchitectureTest` | |', '| Route | `RouteDeclarationArchitectureTest` | |']), 'are not numbered 1 to 2 without a gap'];
        yield 'a rubric without its table' => [self::ITEMS . "Geen tabel.\n", 'has no table with its header'];
    }

    #[DataProvider('rubricsThatDisagree')]
    public function test_it_fails_a_rubric_whose_table_differs_from_the_one_pattern_table(string $rubric, string $words): void
    {
        $violations = $this->violationsOf($rubric);

        self::assertNotSame([], $violations);
        self::assertStringContainsString($words, implode("\n", $violations));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function rubricsThatAgree(): iterable
    {
        yield 'a guard on every row' => [self::ITEMS . self::rubric(['| Model | `ModelConventionArchitectureTest` | |', '| Route | `RouteDeclarationArchitectureTest` | item 3: de policy |'])];
        yield 'a row that is review only with its item' => [self::ITEMS . self::rubric(['| Model | | Item 2: met het oog |', '| Route | PHPStan | |'])];
        yield 'a second table of house rules after the first' => [self::ITEMS . self::rubric(['| Model | `ModelConventionArchitectureTest` | |', '| Route | PHPStan | |']) . "\n| Regel | Guard | Alleen review |\n| --- | --- | --- |\n| Commit | script | |\n"];
    }

    #[DataProvider('rubricsThatAgree')]
    public function test_it_accepts_a_rubric_with_every_row_in_order_and_a_guard_or_item_on_each(string $rubric): void
    {
        self::assertSame([], $this->violationsOf($rubric));
    }

    public function test_it_holds_the_rubric_of_this_repository_to_the_one_pattern_table(): void
    {
        self::assertSame([], new RubricTableGuard(dirname(__DIR__, 2), 'AGENTS.md', 'docs/review-rubric.md', self::TABLE, self::RUBRIC_TABLE)->violations());
    }

    /**
     * @param list<string> $rows
     */
    private static function rubric(array $rows): string
    {
        return "| Rij | Guard | Alleen review |\n| --- | --- | --- |\n" . implode("\n", $rows) . "\n";
    }

    /**
     * @return list<string>
     */
    private function violationsOf(string $rubric): array
    {
        $root = SourceSandbox::create(['AGENTS.md' => self::GUIDE, 'docs/review-rubric.md' => $rubric]);

        try {
            return new RubricTableGuard($root, 'AGENTS.md', 'docs/review-rubric.md', self::TABLE, self::RUBRIC_TABLE)->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
