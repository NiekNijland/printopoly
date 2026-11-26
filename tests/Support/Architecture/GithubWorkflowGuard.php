<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Symfony\Component\Yaml\Yaml;

/**
 * The GitHub Actions form of the CI contract (04-guards.md C4), read from `on:`, the jobs, the matrix and the steps of the workflow
 * files under `.github/workflows`. The kit's jobs sit in a file of their own (kit-checks.yml); the guard reads that file and any
 * file that holds a kit job (one that runs the checks script). Another workflow is only counted, for the rule that a suite runs
 * once per trigger (point 19); the owner may name a file in `hardenedWorkflows` to have its jobs read with the same rules and its
 * hazards (events that carry secrets) flagged. The parts of the checks step are read from the checks script, never copied.
 *
 * Point 19 in this port: the kit's reference counts the backend suite only, and reads a job's events from its `if` alone. Here
 * every suite of `suites` is counted (the backend and the frontend suite), and a job's events are those of its `if` that also
 * start its workflow file (`on:`), so a file that no pull request starts does not count for pull requests.
 */
final readonly class GithubWorkflowGuard
{
    /**
     * @param string $checksScript the project's checks script, whose PARTS table names the parts
     * @param string $composerManifest composer.json: the scripts a `composer <name>` line runs
     * @param string $kitWorkflow the file name of the kit's own workflow inside the workflow directory
     * @param list<string> $deployBranches the branches that deploy: `push.branches` of the kit's file covers each of them
     * @param string $backendTestCommand the line of `backend-tests` that runs the backend suite
     * @param array<string, list<string>> $suites every test suite by name, with the run lines that start it, for point 19
     * @param string $databaseImage DATABASE_IMAGE of scripts/kit-config.sh, compared as written; empty where the project has no database
     * @param list<string> $allowedTriggers owner exceptions: triggers of the kit's file that are no check (`workflow_run`, `workflow_dispatch`)
     * @param list<string> $writingLines run lines an owner exception allows to write
     * @param list<string> $hardenedWorkflows other workflow files (by name) whose jobs and hazards the owner has the guard read
     * @param array<string, int> $timeoutCeilings a ceiling of timeout-minutes per job id that replaces maxTimeoutMinutes
     */
    public function __construct(
        private string $workflowDirectory,
        private string $checksScript,
        private string $composerManifest,
        private string $kitWorkflow,
        private array $deployBranches,
        private string $backendTestCommand,
        private array $suites,
        private string $databaseImage,
        private ?GithubSmokeRules $smoke = null,
        private bool $frontend = true,
        private array $allowedTriggers = [],
        private array $writingLines = [],
        private array $hardenedWorkflows = [],
        private int $maxTimeoutMinutes = 120,
        private array $timeoutCeilings = [],
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $yml = glob($this->workflowDirectory . '/*.yml');
        $yaml = glob($this->workflowDirectory . '/*.yaml');
        $files = [...(is_array($yml) ? $yml : []), ...(is_array($yaml) ? $yaml : [])];

        if ($files === []) {
            return ['no workflow under ' . $this->workflowDirectory . ': copy ci/github-actions.yml of the kit to ' . $this->workflowDirectory . '/' . $this->kitWorkflow];
        }

        foreach ([$this->checksScript => 'the parts of the checks step are read from it', $this->composerManifest => 'the composer scripts the jobs run are read from it'] as $file => $why) {
            if (! is_file($file)) {
                return ['the file ' . $file . ' does not exist: ' . $why];
            }
        }

        $yamlByFile = [];

        foreach ($files as $file) {
            $yamlByFile[basename($file)] = (string) file_get_contents($file);
        }

        return $this->inWorkflows($yamlByFile, (string) file_get_contents($this->checksScript), ComposerScripts::of((string) file_get_contents($this->composerManifest)));
    }

    /**
     * @param array<string, string> $yamlByFile
     * @param string $checksText the text of the checks script
     * @param array<string, list<string>> $composerScripts the scripts of composer.json, each as its list of commands
     * @return list<string>
     */
    public function inWorkflows(array $yamlByFile, string $checksText, array $composerScripts = []): array
    {
        $violations = [];
        $kitFiles = 0;
        $runs = [];

        foreach ($yamlByFile as $name => $yaml) {
            $workflow = YamlValue::map(Yaml::parse($yaml));
            $isKit = $name === $this->kitWorkflow || GithubWorkflowReader::runsChecks($workflow);
            $kitFiles += $isKit ? 1 : 0;
            $hardened = in_array($name, $this->hardenedWorkflows, true);
            $found = $this->inWorkflow($workflow, $isKit, $hardened, $checksText, $composerScripts);

            if ($isKit || $hardened) {
                $found = [...$found, ...GithubWorkflowRules::releaseComments($yaml)];
            }

            $violations = [...$violations, ...array_map(static fn (string $line): string => $name . ': ' . $line, $found)];
            $runs = $this->countSuites($runs, $name, $workflow);
        }

        if ($kitFiles === 0) {
            $violations[] = 'no workflow runs `' . GithubWorkflowReader::CHECKS . '`: the checks job is missing. Copy ci/github-actions.yml of the kit to ' . $this->kitWorkflow;
        }

        foreach ($runs as $suite => $perEvent) {
            foreach ($perEvent as $event => $jobs) {
                if (count($jobs) > 1) {
                    $violations[] = 'the ' . $suite . ' suite runs ' . count($jobs) . ' times on one ' . $event . ' event (' . implode(', ', $jobs) . '): a branch runs each suite once before its deploy. Keep the job of ' . $this->kitWorkflow . ' and remove the other';
                }
            }
        }

        return array_values(array_unique($violations));
    }

    /**
     * @param array<string, array<string, list<string>>> $runs the jobs (`file: job`) that run a suite, per suite and event
     * @param array<array-key, mixed> $workflow
     * @return array<string, array<string, list<string>>>
     */
    private function countSuites(array $runs, string $file, array $workflow): array
    {
        $starting = GithubWorkflowReader::startingEvents($workflow);

        foreach (GithubWorkflowReader::jobs($workflow) as $id => $job) {
            $lines = GithubWorkflowReader::lines($job);
            $events = array_intersect(GithubWorkflowReader::events($job['if'] ?? null), $starting);

            foreach ($this->suites as $suite => $commands) {
                if (array_intersect($commands, $lines) === []) {
                    continue;
                }

                foreach ($events as $event) {
                    $runs[$suite][$event][] = $file . ': ' . $id;
                }
            }
        }

        return $runs;
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @param array<string, list<string>> $composerScripts
     * @return list<string>
     */
    private function inWorkflow(array $workflow, bool $isKit, bool $hardened, string $checksText, array $composerScripts): array
    {
        $jobRules = new GithubJobRules(new GithubServiceRules($this->databaseImage), $this->writingLines, $this->maxTimeoutMinutes, $this->timeoutCeilings);

        if (! $isKit) {
            return $hardened ? [...$jobRules->inWorkflow($workflow), ...GithubWorkflowRules::hazards($workflow)] : [];
        }

        $checks = new GithubChecksRules(ChecksParts::of($checksText), $this->backendTestCommand, $this->databaseImage, $this->frontend, $this->smoke, $composerScripts);

        return [
            ...$jobRules->inWorkflow($workflow),
            ...GithubWorkflowRules::hazards($workflow),
            ...new GithubWorkflowRules($this->deployBranches, $this->allowedTriggers)->inKitWorkflow($workflow),
            ...$checks->violations($workflow),
        ];
    }
}
