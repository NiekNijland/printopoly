<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Symfony\Component\Yaml\Yaml;

/**
 * Point 16 of the CI contract (04-guards.md C4), the task-runner half: the scripts of composer.json have the kit's names, the check
 * scripts and the checks step cannot differ, `lint` (write mode) never runs in CI, and no event script updates a package.
 * The strict-model union check of point 16 stays wired: `test:unit` empties the record first, runs the suites without the
 * suite of the check under a finite memory limit, and runs the check last.
 */
final readonly class ComposerScriptsGuard
{
    public const array NAMES = ['test', 'test:lint', 'test:types', 'test:type-coverage', 'test:unit', 'lint', 'update:requirements'];

    private const array CHECK_SCRIPTS = ['test:lint', 'test:types', 'test:type-coverage'];

    private const array LONG_SCRIPTS = ['test:lint', 'test:types', 'test:type-coverage', 'test:unit', 'lint', 'update:requirements'];

    /**
     * @param string $strictModelReset the command that empties the record of the strict models
     * @param string $strictModelCheck the command that runs the union check, the suite named by $strictModelSuite
     */
    public function __construct(
        private string $composerManifest,
        private string $checksScript,
        private string $workflowDirectory,
        private string $strictModelReset,
        private string $strictModelCheck,
        private string $strictModelSuite,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        foreach ([$this->composerManifest, $this->checksScript] as $file) {
            if (! is_file($file)) {
                return ['the file ' . $file . ' does not exist: the composer scripts and the checks step are read from it'];
            }
        }

        $lines = [];

        $files = glob($this->workflowDirectory . '/*.y*ml');

        foreach (is_array($files) ? $files : [] as $file) {
            foreach (GithubWorkflowReader::jobs(YamlValue::map(Yaml::parseFile($file))) as $job) {
                array_push($lines, ...GithubWorkflowReader::lines($job));
            }
        }

        return $this->inProject((string) file_get_contents($this->composerManifest), (string) file_get_contents($this->checksScript), $lines);
    }

    /**
     * @param list<string> $ciLines the run lines of every workflow
     * @return list<string>
     */
    public function inProject(string $composerJson, string $checksText, array $ciLines): array
    {
        $scripts = ComposerScripts::of($composerJson);
        $checks = implode("\n", array_filter(explode("\n", $checksText), static fn (string $line): bool => ! str_starts_with(ltrim($line), '#')));
        $violations = [];

        foreach (self::NAMES as $name) {
            if (! isset($scripts[$name])) {
                $violations[] = 'composer.json has no script `' . $name . '`: every PHP project has the kit\'s script names (catalog, "Composer scripts")';
            }
        }

        if (isset($scripts['test']) && $scripts['test'] !== [GithubWorkflowReader::CHECKS]) {
            $violations[] = 'the composer script `test` is not `bash scripts/checks.sh`: the one local command is the checks step';
        }

        foreach (self::LONG_SCRIPTS as $name) {
            if (isset($scripts[$name]) && ($scripts[$name][0] ?? '') !== ComposerScripts::NO_TIMEOUT) {
                $violations[] = 'the composer script `' . $name . '` does not start with `' . ComposerScripts::NO_TIMEOUT . '`: the 300-second default kills a long check';
            }
        }

        foreach (self::CHECK_SCRIPTS as $name) {
            $violations = [...$violations, ...$this->coveredByChecks($name, $scripts[$name] ?? [], $checks)];
        }

        return [...$violations, ...$this->unitRules($scripts['test:unit'] ?? []), ...$this->strictModelRules($scripts['test:unit'] ?? []), ...$this->lintRules([...$ciLines, ...explode("\n", $checks)]), ...$this->eventRules($scripts)];
    }

    /**
     * @param list<string> $commands
     * @return list<string>
     */
    private function coveredByChecks(string $name, array $commands, string $checks): array
    {
        if (preg_match('/\bcomposer ' . preg_quote($name, '/') . '\b(?![:-])/', $checks) === 1) {
            return [];
        }

        $violations = [];

        foreach ($commands as $command) {
            $line = ComposerScripts::asShellLine($command);

            if ($line !== null && ! str_contains($checks, $line)) {
                $violations[] = 'the command `' . $command . '` of the composer script `' . $name . '` is no line of scripts/checks.sh (read as `' . $line . '`): the script and the checks step differ. Run `composer ' . $name . '` in a task, or write the command there';
            }
        }

        return $violations;
    }

    /**
     * @param list<string> $commands
     * @return list<string>
     */
    private function unitRules(array $commands): array
    {
        $report = null;

        foreach ($commands as $command) {
            if (preg_match('/^bash scripts\/checks\.sh --coverage (\S+)$/', $command, $match) === 1) {
                $report = $match;
            }
        }

        if ($report === null) {
            return ['the composer script `test:unit` has no line `bash scripts/checks.sh --coverage <report>`: the coverage of the run is held at the committed floor'];
        }

        if (! array_any($commands, static fn (string $command): bool => str_contains($command, '--coverage-clover ' . $report[1]))) {
            return ['the composer script `test:unit` holds the floor on `' . $report[1] . '`, which no command of it writes with `--coverage-clover ' . $report[1] . '`'];
        }

        return [];
    }

    /**
     * @param list<string> $commands
     * @return list<string>
     */
    private function strictModelRules(array $commands): array
    {
        $violations = [];

        if (($commands[1] ?? null) !== $this->strictModelReset) {
            $violations[] = 'the composer script `test:unit` does not start with `' . $this->strictModelReset . '` after the timeout switch: a record of the strict models from an earlier run would pass or fail this one';
        }

        if (($commands === [] ? null : $commands[count($commands) - 1]) !== $this->strictModelCheck) {
            $violations[] = 'the composer script `test:unit` does not end with `' . $this->strictModelCheck . '`: the strict-model violations the run recorded are compared with the counted list last';
        }

        foreach (array_slice($commands, 0, -1) as $command) {
            if (! str_contains($command, 'phpunit')) {
                continue;
            }

            if (! str_contains($command, '--exclude-testsuite ' . $this->strictModelSuite)) {
                $violations[] = 'the run `' . $command . '` of `test:unit` does not pass `--exclude-testsuite ' . $this->strictModelSuite . '`: the union check runs once, after every worker wrote its record';
            }

            if (preg_match('/-d memory_limit=(\d+)[KMG]?(\s|$)/', $command, $limit) !== 1 || $limit[1] === '0') {
                $violations[] = 'the run `' . $command . '` of `test:unit` sets no finite `-d memory_limit`: a test that spins dies as a fatal error that names it, instead of taking the run down';
            }
        }

        return $violations;
    }

    /**
     * @param list<string> $lines
     * @return list<string>
     */
    private function lintRules(array $lines): array
    {
        $violations = [];

        foreach ($lines as $line) {
            if (preg_match('/\bcomposer\s+(run(-script)?\s+)?lint(?![:\w-])/', $line) === 1) {
                $violations[] = 'a CI line runs the composer script `lint`, which writes: `' . trim($line) . '`. CI checks; run `composer test:lint`';
            }
        }

        return $violations;
    }

    /**
     * @param array<string, list<string>> $scripts
     * @return list<string>
     */
    private function eventRules(array $scripts): array
    {
        $violations = [];

        foreach ($scripts as $name => $commands) {
            if (preg_match('/^(pre|post)-/', $name) !== 1) {
                continue;
            }

            foreach ($commands as $command) {
                if (preg_match('/\bcomposer\s+(update|require|bump)\b|\bnpm\s+(install|i|update)\b/', $command) === 1) {
                    $violations[] = 'the event script `' . $name . '` runs `' . $command . '`: an install or a check would update packages without a review. Move it to update:requirements';
                }
            }
        }

        return $violations;
    }
}
