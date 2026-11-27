<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Process\Process;
use Tests\Support\Architecture\AnalyserConfigGuard;
use Tests\Support\Architecture\BlameIgnoreGuard;
use Tests\Support\Architecture\CiExamples;
use Tests\Support\Architecture\ComposerScriptsGuard;
use Tests\Support\Architecture\DependencyBotGuard;
use Tests\Support\Architecture\GuardSuiteGuard;
use Tests\Support\Architecture\PhpUnitRunGuard;
use Tests\Support\SourceSandbox;

/**
 * The points of the CI contract (04-guards.md C4) that read project files no pipeline reader sees: the guard suite (point 4), the
 * blame-revisions file (point 6), the analyser config (point 15), the composer scripts and the dependency bot (point 16).
 */
final class CiProjectFilesArchitectureTest extends TestCase
{
    private const string GUARD_TEST = "<?php\n\nnamespace Tests\\Guards;\n\nuse Tests\\Support\\Architecture\\GuardSuiteGuard;\n\nfinal class ExampleArchitectureTest {}\n";

    private const string PLAIN_TEST = "<?php\n\nnamespace Tests\\Unit;\n\nfinal class LocaleTest {}\n";

    /**
     * @return iterable<string, array{string, string, array<string, string>, string}>
     */
    public static function misplacedGuardTests(): iterable
    {
        $phpunit = self::file('phpunit.xml');
        $checks = self::file('scripts/checks.sh');
        $tree = ['tests/Guards/ExampleArchitectureTest.php' => self::GUARD_TEST, 'tests/Unit/LocaleTest.php' => self::PLAIN_TEST];

        yield 'no guard suite' => [CiExamples::change($phpunit, 'name="Guards"', 'name="Arch"'), $checks, $tree, 'phpunit.xml has no <testsuite name="Guards">'];
        yield 'the suite not run by the checks step' => [$phpunit, CiExamples::change($checks, '--testsuite Guards', '--testsuite Unit'), $tree, 'no line of the checks script runs `--testsuite Guards`'];
        yield 'the suite only in a comment' => [$phpunit, CiExamples::change($checks, '    "Guard tests::php -d memory_limit=-1 vendor/bin/phpunit --testsuite Guards', '#    "Guard tests::php -d memory_limit=-1 vendor/bin/phpunit --testsuite Guards'), $tree, 'no line of the checks script runs `--testsuite Guards`'];
        yield 'a guard test outside the suite' => [$phpunit, $checks, [...$tree, 'tests/Unit/OtherArchitectureTest.php' => self::GUARD_TEST], 'tests/Unit/OtherArchitectureTest.php names a guard class and is in no directory of the Guards suite'];
        yield 'a guard test that another suite runs as well' => [CiExamples::change($phpunit, '<directory>tests/Unit</directory>', "<directory>tests/Unit</directory>\n            <directory>tests/Guards</directory>"), $checks, $tree, 'tests/Guards/ExampleArchitectureTest.php is a guard test that the suite Unit runs as well'];
        yield 'a plain test in the guard suite' => [$phpunit, $checks, [...$tree, 'tests/Guards/LocaleTest.php' => self::PLAIN_TEST], 'tests/Guards/LocaleTest.php is in the Guards suite and names no class of Tests\Support\Architecture'];
    }

    /**
     * @param array<string, string> $tree
     */
    #[DataProvider('misplacedGuardTests')]
    public function test_it_detects_a_guard_test_that_the_checks_step_does_not_run_once(string $phpunit, string $checks, array $tree, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->suiteGuard('')->inTree($phpunit, $checks, $tree)));
    }

    public function test_it_reads_the_guard_suite_from_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            'phpunit.xml' => self::file('phpunit.xml'),
            'scripts/checks.sh' => self::file('scripts/checks.sh'),
            'tests/Guards/ExampleArchitectureTest.php' => self::GUARD_TEST,
            'tests/Unit/LocaleTest.php' => self::PLAIN_TEST,
            'tests/Support/Architecture/ExampleGuard.php' => "<?php\n\nnamespace Tests\\Support\\Architecture;\n\nfinal class ExampleGuard {}\n",
        ], '.checkout-');

        try {
            self::assertSame([], $this->suiteGuard($root)->violations());

            file_put_contents($root . '/tests/Unit/MovedArchitectureTest.php', self::GUARD_TEST);
            self::assertStringContainsString('tests/Unit/MovedArchitectureTest.php names a guard class', implode("\n", $this->suiteGuard($root)->violations()));
        } finally {
            SourceSandbox::remove($root);
        }
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function weakenedComposerScripts(): iterable
    {
        $composer = self::file('composer.json');

        yield 'a check script that is gone' => [CiExamples::change($composer, '"test:type-coverage":', '"test:coverage-of-types":'), 'composer.json has no script `test:type-coverage`'];
        yield 'a local command that is not the checks step' => [CiExamples::change($composer, '"test": "bash scripts/checks.sh"', '"test": "vendor/bin/phpunit"'), 'the composer script `test` is not `bash scripts/checks.sh`'];
        yield 'a long script under the timeout' => [CiExamples::change($composer, "\"test:types\": [\n            \"Composer\\\\Config::disableProcessTimeout\",\n", "\"test:types\": [\n"), 'the composer script `test:types` does not start with'];
        yield 'a check script that the checks step does not run' => [CiExamples::change($composer, '"npm run format:check"', '"npm run format:check",' . "\n            " . '"vendor/bin/phpcs"'), 'the command `vendor/bin/phpcs` of the composer script `test:lint` is no line of scripts/checks.sh'];
        yield 'a unit run without the coverage floor' => [CiExamples::change($composer, "\n            \"bash scripts/checks.sh --coverage coverage/clover.xml\",", ''), 'has no line `bash scripts/checks.sh --coverage <report>`'];
        yield 'a unit run that keeps an old strict-model record' => [CiExamples::change($composer, "\n            \"rm -f storage/logs/model-strictness-*.log\",", ''), 'does not start with `rm -f storage/logs/model-strictness-*.log`'];
        yield 'a unit run that empties the record after the run' => [CiExamples::change($composer, "\n            \"rm -f storage/logs/model-strictness-*.log\",\n            \"@php artisan config:clear --ansi\",", "\n            \"@php artisan config:clear --ansi\",\n            \"rm -f storage/logs/model-strictness-*.log\","), 'does not start with `rm -f storage/logs/model-strictness-*.log`'];
        yield 'a unit run without the union check' => [CiExamples::change($composer, ",\n            \"@php -d memory_limit=2G vendor/bin/phpunit --testsuite ModelStrictness --fail-on-empty-test-suite --fail-on-risky --fail-on-notice\"", ''), 'does not end with `@php -d memory_limit=2G vendor/bin/phpunit --testsuite ModelStrictness'];
        yield 'a union check before the coverage floor' => [CiExamples::change($composer, "\"bash scripts/checks.sh --coverage coverage/clover.xml\",\n            \"@php -d memory_limit=2G vendor/bin/phpunit --testsuite ModelStrictness --fail-on-empty-test-suite --fail-on-risky --fail-on-notice\"", "\"@php -d memory_limit=2G vendor/bin/phpunit --testsuite ModelStrictness --fail-on-empty-test-suite --fail-on-risky --fail-on-notice\",\n            \"bash scripts/checks.sh --coverage coverage/clover.xml\""), 'does not end with `@php -d memory_limit=2G vendor/bin/phpunit --testsuite ModelStrictness'];
        yield 'a run that takes the union check along' => [CiExamples::change($composer, ' --exclude-testsuite ModelStrictness', ''), 'does not pass `--exclude-testsuite ModelStrictness`'];
        yield 'a run without a memory limit' => [CiExamples::change($composer, '@php -d memory_limit=2G -d pcov.enabled=1', '@php -d pcov.enabled=1'), 'sets no finite `-d memory_limit`'];
        yield 'a run with an unlimited memory limit' => [CiExamples::change($composer, '@php -d memory_limit=2G -d pcov.enabled=1', '@php -d memory_limit=-1 -d pcov.enabled=1'), 'sets no finite `-d memory_limit`'];
        yield 'a run with a memory limit of zero' => [CiExamples::change($composer, '@php -d memory_limit=2G -d pcov.enabled=1', '@php -d memory_limit=0 -d pcov.enabled=1'), 'sets no finite `-d memory_limit`'];
        yield 'a floor on a report nobody writes' => [CiExamples::change($composer, '--coverage-clover coverage/clover.xml', '--coverage-clover build/clover.xml'), 'which no command of it writes'];
        yield 'an event script that updates packages' => [CiExamples::change($composer, '"@php artisan vendor:publish --tag=laravel-assets --ansi --force"', '"@composer bump"'), 'the event script `post-update-cmd` runs `@composer bump`'];
    }

    #[DataProvider('weakenedComposerScripts')]
    public function test_it_detects_composer_scripts_that_differ_from_the_checks_step(string $composer, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->scriptsGuard()->inProject($composer, self::file('scripts/checks.sh'), [])));
    }

    public function test_it_detects_a_ci_line_that_runs_the_writing_lint_script(): void
    {
        self::assertStringContainsString('a CI line runs the composer script `lint`', implode("\n", $this->scriptsGuard()->inProject(self::file('composer.json'), self::file('scripts/checks.sh'), ['composer lint'])));
        self::assertSame([], $this->scriptsGuard()->inProject(self::file('composer.json'), self::file('scripts/checks.sh'), ['composer lint:syntax', 'composer test:lint', 'npm run lint']));
    }

    /**
     * @return iterable<string, array{array<string, string>, string, string}>
     */
    public static function weakenedAnalyserConfigs(): iterable
    {
        $configs = ['phpstan.neon' => self::file('phpstan.neon'), 'phpstan-tests.neon' => self::file('phpstan-tests.neon')];
        $composer = self::file('composer.json');

        yield 'a source folder the analyser does not read' => [[...$configs, 'phpstan.neon' => CiExamples::change($configs['phpstan.neon'], "        - database\n", '')], $composer, 'do not name the folder `database`'];
        yield 'the public entry folder left out' => [[...$configs, 'phpstan.neon' => CiExamples::change($configs['phpstan.neon'], "        - public\n", '')], $composer, 'do not name the folder `public`'];
        yield 'the tests left out' => [[...$configs, 'phpstan-tests.neon' => CiExamples::change($configs['phpstan-tests.neon'], "        - tests\n", '')], $composer, 'do not name the folder `tests`'];
        yield 'the bootstrap folder instead of its two files' => [[...$configs, 'phpstan.neon' => CiExamples::change($configs['phpstan.neon'], "        - bootstrap/app.php\n", "        - bootstrap\n")], $composer, 'name the folder `bootstrap`'];
        yield 'a bootstrap file left out' => [[...$configs, 'phpstan.neon' => CiExamples::change($configs['phpstan.neon'], "        - bootstrap/providers.php\n", '')], $composer, 'do not name `bootstrap/providers.php`'];
        yield 'no bleeding edge' => [[...$configs, 'phpstan.neon' => CiExamples::change($configs['phpstan.neon'], "    - vendor/phpstan/phpstan/conf/bleedingEdge.neon\n", '')], $composer, 'do not include vendor/phpstan/phpstan/conf/bleedingEdge.neon'];
        yield 'extensions loaded by an installer' => [$configs, CiExamples::change($composer, '"require-dev": {', '"require-dev": {' . "\n        \"phpstan/extension-installer\": \"^1.4\","), 'requires phpstan/extension-installer'];
    }

    /**
     * @param array<string, string> $configs
     */
    #[DataProvider('weakenedAnalyserConfigs')]
    public function test_it_detects_an_analyser_config_that_reads_less_than_the_ratchet_rows_count(array $configs, string $composer, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->analyserGuard()->inConfigs($configs, self::file('scripts/ci-ratchets.sh'), $composer)));
    }

    public function test_it_leaves_a_path_pattern_of_the_ratchet_rows_to_the_rows(): void
    {
        $configs = ['phpstan.neon' => self::file('phpstan.neon'), 'phpstan-tests.neon' => self::file('phpstan-tests.neon')];
        $ratchets = "SOURCE_PATHS=\"app,resources/views?,resources/js/**\"\nTEST_PATHS=\"tests\"\n";

        self::assertSame([], $this->analyserGuard()->inConfigs($configs, $ratchets, self::file('composer.json')));
        self::assertStringContainsString('`lib`', implode("\n", $this->analyserGuard()->inConfigs($configs, "SOURCE_PATHS=\"app,lib\"\n", self::file('composer.json'))));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function weakenedBotConfigs(): iterable
    {
        $bot = self::file('.github/dependabot.yml');

        yield 'no action updates' => [CiExamples::change($bot, 'package-ecosystem: github-actions', 'package-ecosystem: docker'), 'has no update entry for `github-actions`'];
        yield 'a commit prefix the commit-message check refuses' => [CiExamples::changeAfter($bot, 'package-ecosystem: npm', "prefix: 'NOTICKET chore(deps)'", "prefix: 'build(deps)'"), 'the Dependabot entry for `npm` has the commit-message prefix `build(deps)`'];
        yield 'no commit prefix' => [CiExamples::changeAfter($bot, 'package-ecosystem: composer', "    commit-message:\n      prefix: 'NOTICKET chore(deps)'\n", ''), 'the Dependabot entry for `composer` has the commit-message prefix ``'];
        yield 'another config version' => [CiExamples::change($bot, 'version: 2', 'version: 1'), 'is not `version: 2`'];
    }

    #[DataProvider('weakenedBotConfigs')]
    public function test_it_detects_a_dependency_bot_config_without_the_kit_keys(string $bot, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->botGuard()->inConfig($bot)));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function brokenBlameFiles(): iterable
    {
        yield 'a short hash' => ["b6ab5a4\n", 'which is no full commit hash'];
        yield 'a commit that is not on the branch' => [str_repeat('0', 40) . "\n", 'which is no commit reachable from HEAD'];
        yield 'a file with comments only' => ["# whole-tree format commits\n", 'lists no commit'];
    }

    #[DataProvider('brokenBlameFiles')]
    public function test_it_detects_a_blame_revisions_file_that_skips_nothing_or_names_a_lost_commit(string $text, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->blameGuard(self::root())->inFile($text, static fn (string $hash): bool => $hash !== str_repeat('0', 40))));
    }

    public function test_it_accepts_a_blame_revisions_file_with_reachable_commits_and_says_when_the_file_is_missing(): void
    {
        $head = str_repeat('a', 40);

        self::assertSame([], $this->blameGuard(self::root())->inFile("# the format commit\n" . $head . "\n", static fn (string $hash): bool => $hash === $head));
        self::assertStringContainsString('no .git-blame-ignore-revs in the repository', implode("\n", new BlameIgnoreGuard(self::root() . '/no-such-folder', '.git-blame-ignore-revs')->violations()));
    }

    public function test_it_asks_git_whether_a_listed_commit_is_reachable_in_a_repository_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['README.md' => "example\n"], '.checkout-');
        $git = static fn (string ...$arguments): string => trim(new Process(['git', '-C', $root, '-c', 'user.name=Guard', '-c', 'user.email=guard@example.test', ...$arguments])->mustRun()->getOutput());

        try {
            $git('init', '--quiet');
            $git('add', 'README.md');
            $git('commit', '--quiet', '-m', 'NOTICKET chore: the format commit');
            file_put_contents($root . '/.git-blame-ignore-revs', $git('rev-parse', 'HEAD') . "\n");

            self::assertSame([], $this->blameGuard($root)->violations());

            file_put_contents($root . '/.git-blame-ignore-revs', str_repeat('0', 40) . "\n");
            self::assertStringContainsString('which is no commit reachable from HEAD', implode("\n", $this->blameGuard($root)->violations()));
        } finally {
            SourceSandbox::remove($root);
        }
    }

    /**
     * @return iterable<string, array{array<string, string>, array<string, list<string>>, string}>
     */
    public static function lenientPhpUnitRuns(): iterable
    {
        $configs = ['phpunit.xml' => self::file('phpunit.xml'), 'phpunit.smoke.xml' => self::file('phpunit.smoke.xml')];
        $runs = self::phpUnitRuns();

        yield 'a config that lets a risky test pass' => [[...$configs, 'phpunit.xml' => CiExamples::change($configs['phpunit.xml'], "         failOnRisky=\"true\"\n", '')], $runs, 'phpunit.xml does not set failOnRisky="true"'];
        yield 'a config that switches the notice off' => [[...$configs, 'phpunit.smoke.xml' => CiExamples::change($configs['phpunit.smoke.xml'], 'failOnNotice="true"', 'failOnNotice="false"')], $runs, 'phpunit.smoke.xml does not set failOnNotice="true"'];
        yield 'the switch outside the root element' => [[...$configs, 'phpunit.xml' => CiExamples::change(CiExamples::change($configs['phpunit.xml'], "         failOnRisky=\"true\"\n", ''), '<testsuites>', '<testsuites failOnRisky="true">')], $runs, 'phpunit.xml does not set failOnRisky="true"'];
        yield 'a composer run without the risky option' => [$configs, ['composer.json' => ['@php vendor/bin/phpunit --testsuite Unit --fail-on-notice']], 'composer.json: the run `@php vendor/bin/phpunit --testsuite Unit --fail-on-notice` does not pass `--fail-on-risky`'];
        yield 'a checks task without the notice option' => [$configs, ['scripts/checks.sh' => ['    "Guard tests::php vendor/bin/phpunit --testsuite Guards --fail-on-risky"']], 'does not pass `--fail-on-notice`'];
        yield 'a workflow run without either option' => [$configs, ['.github/workflows/kit-checks.yml' => ['vendor/bin/phpunit -c phpunit.smoke.xml']], 'does not pass `--fail-on-risky`'];
        yield 'a parallel run' => [$configs, ['composer.json' => ['vendor/bin/paratest --processes 4 --fail-on-risky']], 'does not pass `--fail-on-notice`'];
        yield 'a run through artisan' => [$configs, ['scripts/checks.sh' => ['php artisan test --parallel --fail-on-notice']], 'does not pass `--fail-on-risky`'];
        yield 'an option that is only the start of another' => [$configs, ['composer.json' => ['phpunit --fail-on-risky-tests --fail-on-notice']], 'does not pass `--fail-on-risky`'];
    }

    /**
     * @param array<string, string> $configs
     * @param array<string, list<string>> $runs
     */
    #[DataProvider('lenientPhpUnitRuns')]
    public function test_it_detects_a_phpunit_config_or_run_that_lets_a_risky_test_or_a_notice_pass(array $configs, array $runs, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->phpUnitGuard(self::root())->inProject($configs, $runs)));
    }

    public function test_it_accepts_the_strict_runs_comments_and_a_package_name_in_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            'phpunit.xml' => self::file('phpunit.xml'),
            'phpunit.smoke.xml' => self::file('phpunit.smoke.xml'),
            'composer.json' => self::file('composer.json'),
            'scripts/checks.sh' => self::file('scripts/checks.sh') . "# vendor/bin/phpunit runs in the task above\n",
            '.github/workflows/kit-checks.yml' => self::file('.github/workflows/kit-checks.yml'),
            '.github/workflows/tools.yml' => "on: push\njobs:\n  tools:\n    steps:\n      - run: composer require --dev phpunit/phpunit && cp phpunit.xml.dist phpunit.xml\n",
        ], '.checkout-');

        try {
            self::assertSame([], $this->phpUnitGuard($root)->violations());

            file_put_contents($root . '/.github/workflows/tools.yml', "on: push\njobs:\n  tools:\n    steps:\n      - run: vendor/bin/phpunit\n");
            self::assertStringContainsString('.github/workflows/tools.yml: the run `vendor/bin/phpunit` does not pass `--fail-on-risky`', implode("\n", $this->phpUnitGuard($root)->violations()));
            self::assertSame(['the file phpunit.dist.xml does not exist: the PHPUnit configs and runs are read from it'], new PhpUnitRunGuard($root, ['phpunit.dist.xml'], 'composer.json', 'scripts/checks.sh', '.github/workflows', [])->violations());
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_it_keeps_every_phpunit_config_and_run_failing_on_a_risky_test_and_a_notice(): void
    {
        self::assertSame([], $this->phpUnitGuard(self::root())->violations());
    }

    public function test_it_keeps_the_guard_suite_as_the_contract_says(): void
    {
        self::assertSame([], $this->suiteGuard(self::root())->violations());
    }

    public function test_it_keeps_the_composer_scripts_as_the_contract_says(): void
    {
        self::assertSame([], $this->scriptsGuard()->violations());
    }

    public function test_it_keeps_the_analyser_config_as_the_contract_says(): void
    {
        self::assertSame([], $this->analyserGuard()->violations());
    }

    public function test_it_keeps_the_dependency_bot_as_the_contract_says(): void
    {
        self::assertSame([], $this->botGuard()->violations());
    }

    public function test_it_keeps_the_blame_revisions_as_the_contract_says(): void
    {
        self::assertSame([], $this->blameGuard(self::root())->violations());
    }

    private function suiteGuard(string $root): GuardSuiteGuard
    {
        return new GuardSuiteGuard($root, $root . '/phpunit.xml', $root . '/scripts/checks.sh', 'tests', 'Guards', 'Tests\Support\Architecture');
    }

    private function phpUnitGuard(string $root): PhpUnitRunGuard
    {
        return new PhpUnitRunGuard($root, ['phpunit.xml', 'phpunit.smoke.xml'], 'composer.json', 'scripts/checks.sh', '.github/workflows', ['--fail-on-risky' => 'failOnRisky', '--fail-on-notice' => 'failOnNotice']);
    }

    /**
     * @return array<string, list<string>>
     */
    private static function phpUnitRuns(): array
    {
        return ['composer.json' => ['@php vendor/bin/phpunit --testsuite Unit --fail-on-risky --fail-on-notice'], 'scripts/checks.sh' => ['# vendor/bin/phpunit']];
    }

    private function scriptsGuard(): ComposerScriptsGuard
    {
        return new ComposerScriptsGuard(
            self::root() . '/composer.json',
            self::root() . '/scripts/checks.sh',
            self::root() . '/.github/workflows',
            'rm -f storage/logs/model-strictness-*.log',
            '@php -d memory_limit=2G vendor/bin/phpunit --testsuite ModelStrictness --fail-on-empty-test-suite --fail-on-risky --fail-on-notice',
            'ModelStrictness',
        );
    }

    private function analyserGuard(): AnalyserConfigGuard
    {
        return new AnalyserConfigGuard([self::root() . '/phpstan.neon', self::root() . '/phpstan-tests.neon'], self::root() . '/scripts/ci-ratchets.sh', self::root() . '/composer.json', 'public', ['bootstrap' => ['bootstrap/app.php', 'bootstrap/providers.php']]);
    }

    private function botGuard(): DependencyBotGuard
    {
        // The ticket is TICKET of scripts/ci-commit-messages.sh: this project has no ticket system.
        return new DependencyBotGuard(self::root() . '/.github/dependabot.yml', 'NOTICKET', ['composer', 'npm', 'github-actions']);
    }

    private function blameGuard(string $root): BlameIgnoreGuard
    {
        return new BlameIgnoreGuard($root, '.git-blame-ignore-revs');
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
