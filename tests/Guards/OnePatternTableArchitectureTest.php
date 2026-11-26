<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CountedList;
use Tests\Support\Architecture\OnePatternTableGuard;
use Tests\Support\SourceSandbox;

final class OnePatternTableArchitectureTest extends TestCase
{
    private const array TABLE = ['Taak', 'De ene manier', 'Guard', 'Kopieer'];

    private const array GUARD_LIST = ['Guard', 'Rijen', 'Beslist'];

    private const array GUIDES = ['AGENTS.md', 'app/AGENTS.md', 'resources/js/AGENTS.md', 'tests/AGENTS.md', 'docs/review-rubric.md'];

    private const array LISTS = ['lists', 'baselines', 'tests/Guards/lists', 'tests/Support/Architecture/lists', 'eslint-suppressions.json'];

    private const string OWN_LIST = 'tests/Guards/lists/one-pattern.txt';

    /**
     * @return iterable<string, array{string, array<string, string>, string, string}>
     */
    public static function tablesThatBreakARule(): iterable
    {
        yield 'a row without a guard' => ['| Model | casts() | | `app/Models/Edition.php` |', [], 'without-guard Model', 'names no guard'];
        yield 'a row with a guard that is not on the list' => ['| Model | casts() | `models` | `app/Models/Edition.php` |', [], 'unknown-guard Model models', 'not on the guard list'];
        yield 'a row whose example is gone' => ['| Model | casts() | `layout` | `app/Models/Gone.php` |', [], 'no-example Model', 'names no file that exists'];
        yield 'a row with only text in the Copy column' => ['| Model | casts() | `layout` | het model van de editie |', [], 'no-example Model', 'names no file that exists'];
        yield 'an example on a counted list' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', ['lists/layout.txt' => "place app/Models/Edition.php\n"], 'example-on-list Model app/Models/Edition.php lists/layout.txt', 'stands on a list'];
        yield 'an example in the lint suppressions' => ['| Hook | const arrow | `layout` | `resources/js/hooks/use-x.ts` |', ['eslint-suppressions.json' => "{\n  \"resources/js/hooks/use-x.ts\": {\n    \"func-style\": { \"count\": 1 }\n  }\n}\n"], 'example-on-list Hook resources/js/hooks/use-x.ts eslint-suppressions.json', 'stands on a list'];
        yield 'an example in a keyed baseline' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', ['tests/Support/Architecture/lists/phpstan-banned-calls.txt' => "app/Models/Edition.php: Calling x is forbidden\n"], 'example-on-list Model app/Models/Edition.php tests/Support/Architecture/lists/phpstan-banned-calls.txt', 'stands on a list'];
        yield 'lands with in the Guard column' => ['| Model | casts() | lands with stap 8 | `app/Models/Edition.php` |', [], 'lands-with AGENTS.md:', 'stands in the Copy column of the one-pattern table only'];
        yield 'lands with in a sentence of the root guide' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', ['extra' => "Dit voorbeeld lands with stap 8.\n"], 'lands-with AGENTS.md:', 'stands in the Copy column'];
        yield 'lands with in the rubric' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', ['docs/review-rubric.md' => "| Model | Lands With stap 8 | |\n"], 'lands-with docs/review-rubric.md:1', 'stands in the Copy column'];
        yield 'lands with in a nested guide' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', ['app/AGENTS.md' => "De guard lands with stap 8.\n"], 'lands-with app/AGENTS.md:1', 'stands in the Copy column'];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('tablesThatBreakARule')]
    public function test_it_fails_a_row_without_a_guard_or_example_and_lands_with_outside_the_copy_column(string $row, array $files, string $finding, string $words): void
    {
        [$findings, $explained] = $this->findingsOf($row, $files);

        self::assertStringContainsString($finding, implode("\n", $findings));
        self::assertStringContainsString($words, implode("\n", $explained));
    }

    public function test_it_fails_a_root_guide_without_the_table(): void
    {
        $root = SourceSandbox::create(['AGENTS.md' => "# Gids\n\nGeen tabel.\n"]);

        try {
            $findings = $this->guard($root)->findings();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertSame(['no-table AGENTS.md'], $findings);
    }

    /**
     * @return iterable<string, array{string, array<string, string>}>
     */
    public static function tablesThatKeepTheRules(): iterable
    {
        yield 'a guard of the list and an example on no list' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', []];
        yield 'two guards and two examples' => ['| Model | casts() | `layout`, `class-shape` | `app/Models/Edition.php` met `app/Policies/EditionPolicy.php` |', []];
        yield 'lands with in the Copy column' => ['| Validatie | een form request | `layout` | lands with stap 8, PR form requests |', []];
        yield 'an example at the root of the repository' => ['| Verboden aanroep | de analyser | `layout` | `phpstan.neon` |', []];
        yield 'a list that names a longer path' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', ['lists/layout.txt' => "place app/Models/EditionPhoto.php\nplace old/app/Models/Edition.php.bak\n"]];
        yield 'the example on the counted list of this guard' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', [self::OWN_LIST => "example-on-list Model app/Models/Edition.php lists/layout.txt\n"]];
        yield 'lands with in a file that is no guide' => ['| Model | casts() | `layout` | `app/Models/Edition.php` |', ['docs/notes.md' => "Dit lands with stap 8.\n"]];
    }

    /**
     * @param array<string, string> $files
     */
    #[DataProvider('tablesThatKeepTheRules')]
    public function test_it_accepts_a_row_with_a_listed_guard_and_a_clean_example(string $row, array $files): void
    {
        self::assertSame([], $this->findingsOf($row, $files)[0]);
    }

    public function test_it_holds_the_one_pattern_table_to_its_guards_and_examples_or_to_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $guard = $this->guard($root);

        self::assertContains('Plek van een klasse', $guard->concerns());
        self::assertContains('layout', $guard->guardNames());
        self::assertSame([], new CountedList($root, self::OWN_LIST)->violations($guard->findings(), $guard->explain(...)));
    }

    /**
     * @param array<string, string> $files
     * @return array{list<string>, list<string>}
     */
    private function findingsOf(string $row, array $files): array
    {
        $extra = $files['extra'] ?? '';
        unset($files['extra']);
        $guide = "# Gids\n\n## Guards\n\n| Guard | Rijen | Beslist |\n| --- | --- | --- |\n| `layout` | `docs/guards/layout.md` | de plek |\n| `class-shape` | `docs/guards/class-shape.md` | de vorm |\n\n" . $extra
            . "\n## One pattern\n\n| Taak | De ene manier | Guard | Kopieer |\n| --- | --- | --- | --- |\n" . $row . "\n\nNa de tabel.\n";
        $root = SourceSandbox::create(['AGENTS.md' => $guide, 'app/Models/Edition.php' => "<?php\n", 'app/Policies/EditionPolicy.php' => "<?php\n", 'resources/js/hooks/use-x.ts' => '', 'phpstan.neon' => '', ...$files]);

        try {
            $guard = $this->guard($root);
            $findings = $guard->findings();

            return [$findings, $guard->explain($findings)];
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private function guard(string $root): OnePatternTableGuard
    {
        return new OnePatternTableGuard($root, 'AGENTS.md', self::TABLE, self::GUARD_LIST, self::GUIDES, self::LISTS, self::OWN_LIST);
    }
}
