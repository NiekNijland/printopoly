<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Symfony\Component\Yaml\Yaml;

/**
 * Point 16 of the CI contract (04-guards.md C4), the task-runner half: the scripts of composer.json have the kit's names, the check
 * scripts and the checks step cannot differ, `lint` (write mode) never runs in CI, and no event script updates a package.
 *
 * Not asserted here, by decision: the strict-model union check of point 16. It is the recorder of Laravel's strict-model mode
 * (lazy loading and the like) over relational Eloquent models, and this project has no such recorder: its models are MongoDB
 * documents.
 */
final readonly class ComposerScriptsGuard
{
    public const array NAMES = ['test', 'test:lint', 'test:types', 'test:type-coverage', 'test:unit', 'lint', 'update:requirements'];

    private const array CHECK_SCRIPTS = ['test:lint', 'test:types', 'test:type-coverage'];

    private const array LONG_SCRIPTS = ['test:lint', 'test:types', 'test:type-coverage', 'test:unit', 'lint', 'update:requirements'];

    public function __construct(
        private string $composerManifest,
        private string $checksScript,
        private string $workflowDirectory,
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

        return [...$violations, ...$this->unitRules($scripts['test:unit'] ?? []), ...$this->lintRules([...$ciLines, ...explode("\n", $checks)]), ...$this->eventRules($scripts)];
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
        $last = $commands === [] ? '' : $commands[count($commands) - 1];

        if (preg_match('/^bash scripts\/checks\.sh --coverage (\S+)$/', $last, $report) !== 1) {
            return ['the composer script `test:unit` does not end with `bash scripts/checks.sh --coverage <report>`: the coverage of the run is held at the committed floor'];
        }

        if (! array_any($commands, static fn (string $command): bool => str_contains($command, '--coverage-clover ' . $report[1]))) {
            return ['the composer script `test:unit` holds the floor on `' . $report[1] . '`, which no command of it writes with `--coverage-clover ' . $report[1] . '`'];
        }

        return [];
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
