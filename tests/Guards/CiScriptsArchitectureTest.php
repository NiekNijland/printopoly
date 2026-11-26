<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CiExamples;
use Tests\Support\Architecture\CiSafetyGuard;
use Tests\Support\Architecture\YamlValue;

/**
 * The checks script of the CI contract (04-guards.md C4, points 3, 5, 6, 11, 12, 20 and 21): `scripts/checks.sh`, read with
 * `scripts/kit-config.sh` and the npm scripts its tasks run. The failing examples are one-line edits of a copy of the real script.
 */
final class CiScriptsArchitectureTest extends TestCase
{
    private const string ZERO_WARNINGS = '--max-warnings=0';

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function weakenedScripts(): iterable
    {
        $checks = self::file('scripts/checks.sh');

        yield 'a task that is gone' => [CiExamples::change($checks, '    "Lint::composer validate --strict --no-check-publish && composer lint:syntax && npm run lint && npm run knip"' . "\n", ''), 'no task named "Lint"'];
        yield 'the parallel checks before the ratchets' => [CiExamples::change($checks, "set -euo pipefail\n", "set -euo pipefail\nbash scripts/ci-parallel.sh \"Early::true\"\n"), 'does not run its four stages in the order'];
        yield 'a dashboard run that is not offline and detailed' => [CiExamples::change($checks, ' --offline --details', ' --offline'), 'does not run with --offline --details'];
        yield 'a placeholder' => [CiExamples::change($checks, 'vendor/bin/rector process --dry-run', '<refactoring tool in dry-run mode>'), 'still holds a <placeholder>'];
        yield 'a commit' => [CiExamples::change($checks, 'bash scripts/ci-parallel.sh "${SELECTED[@]}"', "git commit -am autofix\nbash scripts/ci-parallel.sh \"\${SELECTED[@]}\""), 'a command writes to the repository'];
        yield 'a check that succeeds anyway' => [CiExamples::change($checks, '"Refactor::vendor/bin/rector process --dry-run"', '"Refactor::vendor/bin/rector process --dry-run || true"'), 'succeed anyway'];
        yield 'a check over the changed files only' => [CiExamples::change($checks, 'composer pint -- --test', 'composer pint -- --test --dirty'), 'takes a list of changed files'];
        yield 'an install that is no lock-file install' => [CiExamples::change($checks, 'bash scripts/ci-parallel.sh "${SELECTED[@]}"', "npm install\nbash scripts/ci-parallel.sh \"\${SELECTED[@]}\""), 'does not come from the lock file'];
        yield 'an audit of a deploying branch that covers the development tools' => [CiExamples::change($checks, '--no-dev --format=json --no-interaction | bash scripts/audit-gate.sh && npm audit --omit=dev', '--format=json --no-interaction | bash scripts/audit-gate.sh && npm audit'), 'does not cover production dependencies only'];
        yield 'an audit of a pull request that skips the development tools' => [CiExamples::change($checks, 'npm audit --audit-level=info"' . "\n    )\nfi", 'npm audit --omit=dev --audit-level=info"' . "\n    )\nfi"), 'covers production dependencies only: the full audit runs there'];
        yield 'one audit for both runs' => [CiExamples::change($checks, 'if [ "$RUN" = "--main" ]; then', 'if [ "$RUN" = "--other" ]; then'), 'no separate "Audit" task'];
        yield 'the guard tests left out' => [CiExamples::change($checks, '    "Guard tests::php -d memory_limit=-1 vendor/bin/phpunit --testsuite Guards --fail-on-empty-test-suite"' . "\n", ''), 'no task named "Guard tests"'];
    }

    #[Test]
    #[DataProvider('weakenedScripts')]
    public function it_detects_a_checks_script_that_weakens_the_checks_step(string $checks, string $reason): void
    {
        self::assertStringContainsString($reason, $this->violations($checks));
    }

    /**
     * @return iterable<string, array{array<string, string>, string}>
     */
    public static function weakenedNpmScripts(): iterable
    {
        $scripts = self::npmScriptsWithoutLintCache();

        yield 'a linter that may print warnings' => [[...$scripts, 'lint' => 'eslint .'], 'the "Lint" task does not run with `--max-warnings=0`'];
        yield 'a type-aware lint run with a content cache' => [[...$scripts, 'lint' => 'eslint . --max-warnings=0 --cache --cache-strategy content'], 'the type-aware lint run has a content cache'];
        yield 'a lint run with a cache file' => [[...$scripts, 'lint' => 'eslint . --max-warnings=0 --cache-location .cache/eslint'], 'the type-aware lint run has a content cache'];
        yield 'a lint run over the changed files' => [[...$scripts, 'lint' => 'eslint $(git diff --name-only) --max-warnings=0'], 'takes a list of changed files'];
    }

    /**
     * @param array<string, string> $npmScripts
     */
    #[Test]
    #[DataProvider('weakenedNpmScripts')]
    public function it_reads_the_npm_scripts_the_tasks_run(array $npmScripts, string $reason): void
    {
        self::assertStringContainsString($reason, $this->violations(self::file('scripts/checks.sh'), $npmScripts));
    }

    #[Test]
    public function it_detects_a_default_base_branch_that_is_not_the_branch_pull_requests_target(): void
    {
        $violations = new CiSafetyGuard('develop', zeroWarnings: self::ZERO_WARNINGS)->inChecks(self::file('scripts/checks.sh'), self::file('scripts/kit-config.sh'), self::npmScriptsWithoutLintCache());

        self::assertStringContainsString('DEFAULT_BASE_BRANCH in kit-config.sh is not `develop`', implode("\n", $violations));
    }

    #[Test]
    public function it_accepts_the_checks_script_comments_that_name_a_banned_command_and_a_writing_line_the_owner_kept(): void
    {
        $checks = self::file('scripts/checks.sh');
        $commented = CiExamples::change($checks, '# The one command.', "# git push is never run; || true is never written\n# \"Lint::<placeholder in a comment>\"");
        $kept = CiExamples::change($checks, 'bash scripts/ci-parallel.sh "${SELECTED[@]}"', "git commit -am autofix\nbash scripts/ci-parallel.sh \"\${SELECTED[@]}\"");
        $global = CiExamples::change($checks, 'bash scripts/ci-parallel.sh "${SELECTED[@]}"', "npm install -g npm@11.6.2\nbash scripts/ci-parallel.sh \"\${SELECTED[@]}\"");

        self::assertSame('', $this->violations($checks, self::npmScriptsWithoutLintCache()));
        self::assertSame('', $this->violations($commented, self::npmScriptsWithoutLintCache()));
        self::assertSame('', $this->violations($global, self::npmScriptsWithoutLintCache()));
        self::assertSame([], new CiSafetyGuard('main', ['git commit -am autofix'], self::ZERO_WARNINGS)->inChecks($kept, self::file('scripts/kit-config.sh'), self::npmScriptsWithoutLintCache()));
    }

    #[Test]
    public function it_keeps_the_checks_script_as_the_contract_says(): void
    {
        self::assertSame([], new CiSafetyGuard('main', zeroWarnings: self::ZERO_WARNINGS)->inChecks(self::file('scripts/checks.sh'), self::file('scripts/kit-config.sh'), self::npmScripts()));
    }

    /**
     * @param array<string, string>|null $npmScripts the npm scripts; the real ones without the lint cache when null
     */
    private function violations(string $checks, ?array $npmScripts = null): string
    {
        return implode("\n", new CiSafetyGuard('main', zeroWarnings: self::ZERO_WARNINGS)->inChecks($checks, self::file('scripts/kit-config.sh'), $npmScripts ?? self::npmScriptsWithoutLintCache()));
    }

    /**
     * The real npm scripts with the content cache taken out of `lint`: the examples test one change each, and the real `lint`
     * script still carries the cache (the real-tree case reports it).
     *
     * @return array<string, string>
     */
    private static function npmScriptsWithoutLintCache(): array
    {
        $scripts = self::npmScripts();
        $scripts['lint'] = trim((string) preg_replace('/\s--cache(-strategy \S+)?/', '', $scripts['lint'] ?? ''));

        return $scripts;
    }

    /**
     * @return array<string, string>
     */
    private static function npmScripts(): array
    {
        $scripts = [];

        foreach (YamlValue::map(json_decode(self::file('package.json'), true, flags: JSON_THROW_ON_ERROR), 'scripts') as $name => $command) {
            if (is_string($command)) {
                $scripts[(string) $name] = $command;
            }
        }

        return $scripts;
    }

    private static function file(string $path): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2) . '/' . $path);
    }
}
