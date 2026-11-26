<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\GuideSetGuard;
use Tests\Support\SourceSandbox;

final class GuideSetArchitectureTest extends TestCase
{
    private const array GUARD_LIST = ['Guard', 'Rijen', 'Beslist'];

    private const array SOURCE_ROOTS = ['app', 'resources', 'tests'];

    private const string RATCHETS = "table() {\n    cat <<'TABLE'\nguide-future-tense   max  grep   AGENTS.md,app/AGENTS.md,docs/review-rubric.md?  (^|[^A-Za-z])([Ww]ill)([^A-Za-z]|\$)\nTABLE\n}\n";

    /**
     * @return iterable<string, array{array<string, string|null>, string}>
     */
    public static function guideSetsThatDisagree(): iterable
    {
        yield 'a guard on the list without a rows file' => [['docs/guards/layout.md' => null], 'the guard layout has no rows file docs/guards/layout.md'];
        yield 'a rows file on no row of the list' => [['docs/guards/size.md' => "# Guard: size\n"], 'docs/guards/size.md is on no row of the guard list'];
        yield 'a guard that stands twice' => [['AGENTS.md' => self::guide("| `layout` | `docs/guards/layout.md` | de plek |\n| `layout` | `docs/guards/layout.md` | nog eens |\n")], 'the guard layout stands twice'];
        yield 'a rows file named by another path' => [['AGENTS.md' => self::guide("| `layout` | `docs/layout.md` | de plek |\n")], 'names its rows file as'];
        yield 'a guide without the guard list' => [['AGENTS.md' => "# Gids\n"], 'has no guard list'];
        yield 'a nested guide that the row does not count' => [['tests/AGENTS.md' => "# Tests\n"], 'tests/AGENTS.md is a guide that the row guide-future-tense'];
        yield 'a deeper nested guide' => [['resources/js/AGENTS.md' => "# Frontend\n"], 'resources/js/AGENTS.md is a guide that the row guide-future-tense'];
        yield 'a ratchet script without the row' => [['scripts/ci-ratchets.sh' => "table() {\n}\n"], 'has no row guide-future-tense'];
        yield 'a row that counts the guides by a placeholder' => [['scripts/ci-ratchets.sh' => str_replace('AGENTS.md,app/AGENTS.md,docs/review-rubric.md?', '@SOURCE_PATHS', self::RATCHETS)], 'AGENTS.md is a guide that the row guide-future-tense'];
    }

    /**
     * @param array<string, string|null> $changes
     */
    #[DataProvider('guideSetsThatDisagree')]
    public function test_it_fails_a_guard_list_and_rows_files_that_differ_and_a_guide_the_tense_row_misses(array $changes, string $words): void
    {
        $violations = $this->violationsOf($changes);

        self::assertNotSame([], $violations);
        self::assertStringContainsString($words, implode("\n", $violations));
    }

    /**
     * @return iterable<string, array{array<string, string|null>}>
     */
    public static function guideSetsThatAgree(): iterable
    {
        yield 'the list, the rows files and the row agree' => [[]];
        yield 'a file named AGENTS.md outside the source roots' => [['vendor/package/AGENTS.md' => "# Vendor\n", 'docs/design/AGENTS.md' => "# Ontwerp\n"]];
        yield 'a rubric that is optional in the row' => [['docs/review-rubric.md' => null]];
        yield 'a text file beside the rows files' => [['docs/guards/notes.txt' => 'geen rijen']];
    }

    /**
     * @param array<string, string|null> $changes
     */
    #[DataProvider('guideSetsThatAgree')]
    public function test_it_accepts_a_guard_list_that_matches_its_rows_files_and_a_row_over_every_guide(array $changes): void
    {
        self::assertSame([], $this->violationsOf($changes));
    }

    public function test_it_holds_the_guides_of_this_repository_to_the_guard_list_and_the_tense_row(): void
    {
        $guard = $this->guard(dirname(__DIR__, 2));

        self::assertContains('tests/AGENTS.md', $guard->guides());
        self::assertSame([], $guard->violations());
    }

    private static function guide(string $rows): string
    {
        return "# Gids\n\n| Guard | Rijen | Beslist |\n| --- | --- | --- |\n" . $rows . "\nNa de lijst.\n";
    }

    /**
     * @param array<string, string|null> $changes
     * @return list<string>
     */
    private function violationsOf(array $changes): array
    {
        $files = [
            'AGENTS.md' => self::guide("| `layout` | `docs/guards/layout.md` | de plek |\n| `file-size` | `docs/guards/file-size.md` | de lengte |\n"),
            'app/AGENTS.md' => "# Backend\n",
            'docs/review-rubric.md' => "# Rubric\n",
            'docs/guards/layout.md' => "# Guard: layout\n",
            'docs/guards/file-size.md' => "# Guard: file-size\n",
            'scripts/ci-ratchets.sh' => self::RATCHETS,
        ];

        foreach ($changes as $path => $contents) {
            if ($contents === null) {
                unset($files[$path]);
            } else {
                $files[$path] = $contents;
            }
        }

        $root = SourceSandbox::create($files);

        try {
            return $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }

    private function guard(string $root): GuideSetGuard
    {
        return new GuideSetGuard($root, 'AGENTS.md', self::GUARD_LIST, 'docs/guards', self::SOURCE_ROOTS, 'AGENTS.md', ['docs/review-rubric.md'], 'scripts/ci-ratchets.sh', 'guide-future-tense');
    }
}
