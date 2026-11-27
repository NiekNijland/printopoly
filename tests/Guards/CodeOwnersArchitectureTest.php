<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CiExamples;
use Tests\Support\Architecture\CodeOwnersGuard;
use Tests\Support\RecursiveFiles;

/**
 * Point 22 of the CI contract (04-guards.md C4): the files that carry the guards are covered by a code-owners rule that names an
 * owner. The guard reads `.github/CODEOWNERS` and its rules, not the host setting that makes the review required: this is a
 * private repository on a free GitHub plan, where branch protection and rulesets are not available, so nothing can be enforced
 * yet and no test could read the setting anyway. The file names the owner, so the rule holds the moment the plan allows it.
 */
final class CodeOwnersArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string}>
     */
    public static function uncoveredGuardFiles(): iterable
    {
        $owners = self::file('.github/CODEOWNERS');

        yield 'the scripts not covered' => [CiExamples::change($owners, "/scripts/ @NiekNijland\n", ''), 'scripts/debt-caps.json is covered by no code-owners rule'];
        yield 'the workflow directory not covered' => [CiExamples::change($owners, "/.github/workflows/ @NiekNijland\n", ''), '.github/workflows/kit-checks.yml is covered by no'];
        yield 'the guard folder not covered' => [CiExamples::change($owners, "/tests/Support/Architecture/ @NiekNijland\n", ''), 'tests/Support/Architecture/CodeOwnersGuard.php is covered by no'];
        yield 'the thin tests not covered' => [CiExamples::change($owners, "/tests/Guards/ @NiekNijland\n", ''), 'tests/Guards/CodeOwnersArchitectureTest.php is covered by no'];
        yield 'the suite definition not covered' => [CiExamples::change($owners, "/phpunit.xml @NiekNijland\n", ''), 'phpunit.xml is covered by no'];
        yield 'the file not covering itself' => [CiExamples::change($owners, "/.github/CODEOWNERS @NiekNijland\n", ''), '.github/CODEOWNERS is covered by no'];
        yield 'a later rule that takes a script out of the review' => [$owners . "/scripts/kit-config.sh\n", 'scripts/kit-config.sh is matched last by a rule with no owner'];
        yield 'a pattern that matches nothing' => [CiExamples::change($owners, "/scripts/ @NiekNijland\n", "/script/ @NiekNijland\n"), 'scripts/checks.sh is covered by no'];
        yield 'a negated rule' => [$owners . "!/scripts/checks.sh\n", 'negates a rule'];
        yield 'a bot as the only owner' => [CiExamples::change($owners, "/scripts/ @NiekNijland\n", "/scripts/ @release-bot\n"), 'scripts/checks.sh is owned by a bot only'];
        yield 'an automation account as the only owner' => [CiExamples::change($owners, "/scripts/ @NiekNijland\n", "/scripts/ @dependabot[bot]\n"), 'scripts/checks.sh is owned by a bot only'];
    }

    #[DataProvider('uncoveredGuardFiles')]
    public function test_it_detects_a_code_owners_file_that_leaves_a_guard_file_without_the_review_of_its_owner(string $codeOwners, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", new CodeOwnersGuard('', $this->guardedPaths())->inCodeOwners($codeOwners)));
    }

    public function test_it_accepts_a_code_owners_file_with_a_bot_beside_a_person_and_says_when_the_file_is_missing(): void
    {
        $withBot = CiExamples::change(self::file('.github/CODEOWNERS'), "/scripts/ @NiekNijland\n", "/scripts/ @NiekNijland @release-bot\n");
        $commented = self::file('.github/CODEOWNERS') . "# /scripts/kit-config.sh\n";

        self::assertSame([], new CodeOwnersGuard('', $this->guardedPaths())->inCodeOwners($withBot));
        self::assertSame([], new CodeOwnersGuard('', $this->guardedPaths())->inCodeOwners($commented));
        self::assertStringContainsString('no code-owners file', implode("\n", new CodeOwnersGuard('/no/such/CODEOWNERS', $this->guardedPaths())->violations()));
    }

    public function test_it_keeps_every_guard_file_under_the_review_of_its_owner(): void
    {
        self::assertSame([], new CodeOwnersGuard(self::root() . '/.github/CODEOWNERS', $this->guardedPaths())->violations());
    }

    /**
     * The guard files of the real tree: every file of the folders that carry the guards, read from disk, plus the single files.
     *
     * @return list<string>
     */
    private function guardedPaths(): array
    {
        $paths = ['phpunit.xml', '.github/dependabot.yml', '.github/CODEOWNERS', '.git-blame-ignore-revs'];

        foreach (['scripts', '.github/workflows', 'tests/Support/Architecture', 'tests/Guards'] as $folder) {
            foreach (RecursiveFiles::in(self::root() . '/' . $folder) as $file) {
                $paths[] = mb_substr($file->getPathname(), mb_strlen(self::root()) + 1);
            }
        }

        return $paths;
    }

    private static function file(string $path): string
    {
        return (string) file_get_contents(self::root() . '/' . $path);
    }

    private static function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
