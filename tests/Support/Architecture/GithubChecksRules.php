<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * The rules about the kit's own jobs of the GitHub form: the matrix over the parts, the checks of a pull request and of a deploying
 * branch, the aggregate job that is the one required check, the test jobs and the smoke run, and the scheduled job. The parts come
 * from the checks script (ChecksParts), never from a copy.
 *
 * Decisions (this project):
 *   - Point 14: `backend-tests` runs `composer test:unit`, and that composer script ends with the line
 *     `bash scripts/checks.sh --coverage coverage/clover.xml`. The coverage line is accepted in the job or in the composer script
 *     a `composer <name>` line of the job runs.
 *   - Point 13: the whole-tree mutation run takes hours, so it runs weekly: its step may carry `if: github.event.schedule ==
 *     '<cron>'` when that cron is one of the workflow's schedule crons, and no other condition.
 */
final readonly class GithubChecksRules
{
    public const string PART_LINE = 'bash scripts/checks.sh --part ${{ matrix.part }}';

    public const string MAIN_LINE = 'bash scripts/checks.sh --main --part ${{ matrix.part }}';

    public const string MUTATION_LINE = 'bash scripts/mutation.sh';

    public const string SCHEDULED_LINE = GithubWorkflowReader::CHECKS . ' --scheduled';

    private const string AGGREGATE_LINE = 'test "$RESULT" = success';

    /**
     * @param list<string> $parts the parts of the checks step, read from the checks script
     * @param string $databaseImage DATABASE_IMAGE of the kit config; empty where the project has no database
     * @param bool $frontend whether the project has a frontend: a `frontend-tests` job and a browser in the smoke run
     * @param array<string, list<string>> $composerScripts the scripts of composer.json, each as its list of commands
     */
    public function __construct(
        private array $parts,
        private string $backendTestCommand,
        private string $databaseImage,
        private bool $frontend,
        private ?GithubSmokeRules $smoke,
        private array $composerScripts = [],
    ) {
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    public function violations(array $workflow): array
    {
        $jobs = GithubWorkflowReader::jobs($workflow);
        $violations = [];

        foreach ([self::PART_LINE => 'pull_request', self::MAIN_LINE => 'push'] as $line => $event) {
            $carrying = array_filter($jobs, static fn (array $job): bool => in_array($line, GithubWorkflowReader::lines($job), true));

            if ($carrying === []) {
                $violations[] = 'no job runs exactly `' . $line . '`: the ' . ($event === 'push' ? 'checks of a deploying branch' : 'checks of a pull request') . ' are missing';
            }

            foreach ($carrying as $id => $job) {
                $violations = [...$violations, ...$this->checksJobRules($id, $job, $event)];
            }
        }

        return [...$violations, ...$this->aggregateRules($jobs), ...$this->testRules($jobs), ...$this->scheduledRules($jobs, $this->crons($workflow))];
    }

    /**
     * @param array<array-key, mixed> $job
     * @return list<string>
     */
    private function checksJobRules(string $id, array $job, string $event): array
    {
        $violations = [];

        if (GithubWorkflowReader::condition($job) !== "github.event_name == '" . $event . "'") {
            $violations[] = 'job `' . $id . "` has another condition than `github.event_name == '" . $event . "'`: a condition narrows the checks";
        }

        if (GithubWorkflowReader::needs($job) !== []) {
            $violations[] = 'job `' . $id . '` waits for ' . implode(', ', GithubWorkflowReader::needs($job)) . ': a checks job that another job can skip or fail first never reports its own result. Remove `needs`';
        }

        $matrix = YamlValue::map($job, 'strategy', 'matrix');
        $parts = array_key_exists('part', $matrix) && is_array($matrix['part']) ? YamlValue::strings($matrix, 'part') : null;

        if ($parts === null || count($parts) !== count(YamlValue::map($matrix, 'part')) || array_diff($this->parts, $parts) !== [] || array_diff($parts, $this->parts) !== []) {
            $violations[] = 'the matrix of job `' . $id . '` is not exactly the parts of PARTS (' . implode(', ', $this->parts) . '): write `part: [' . implode(', ', $this->parts) . ']`';
        }

        $extraKeys = array_diff(array_map(strval(...), array_keys($matrix)), ['part']);

        if ($extraKeys !== []) {
            $violations[] = 'the matrix of job `' . $id . '` has the key `' . implode('`, `', $extraKeys) . '` besides `part`: an exclude, an include or another axis drops or adds a part the guard cannot count';
        }

        foreach (GithubWorkflowReader::steps($job) as $step) {
            if (in_array(YamlValue::string($step, 'run'), [self::PART_LINE, self::MAIN_LINE], true)) {
                $violations = [...$violations, ...$this->checksStepRules($id, $step)];
            }
        }

        if ($event === 'pull_request' && YamlValue::at($job, 'env', 'CHECK_BASE') !== '${{ github.base_ref }}') {
            $violations[] = 'job `' . $id . '` does not set CHECK_BASE from `${{ github.base_ref }}` in its env';
        }

        $head = YamlValue::at($job, 'env', 'CHECK_HEAD');

        if ($head !== null && YamlValue::at(GithubWorkflowReader::checkout($job), 'with', 'ref') !== $head) {
            $violations[] = 'job `' . $id . '` sets CHECK_HEAD but does not check out that revision: GitHub merges first, and the checks read HEAD. Remove CHECK_HEAD';
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $step
     * @return list<string>
     */
    private function checksStepRules(string $id, array $step): array
    {
        $violations = [];

        if (isset($step['if'])) {
            $violations[] = 'the checks step of job `' . $id . '` has a condition of its own: remove it';
        }

        foreach (['shell', 'working-directory'] as $key) {
            if (isset($step[$key])) {
                $violations[] = 'the checks step of job `' . $id . '` sets `' . $key . '`: nothing replaces the line, its shell or its folder';
            }
        }

        foreach (['CHECK_BASE', 'CHECK_HEAD', 'DASHBOARD_MODE'] as $key) {
            if (array_key_exists($key, YamlValue::map($step, 'env'))) {
                $violations[] = 'the checks step of job `' . $id . '` sets ' . $key . ' in its own env: it would override the base the job hands to the ratchets';
            }
        }

        return $violations;
    }

    /**
     * @param array<string, array<array-key, mixed>> $jobs
     * @return list<string>
     */
    private function aggregateRules(array $jobs): array
    {
        $aggregates = array_filter($jobs, static fn (array $job): bool => in_array(self::AGGREGATE_LINE, GithubWorkflowReader::lines($job), true));
        $checks = array_keys(array_filter($jobs, static fn (array $job): bool => in_array(self::PART_LINE, GithubWorkflowReader::lines($job), true)));
        $violations = [];

        if ($aggregates === []) {
            return ['no aggregate job: a job with `needs`, `if: always()` and the step `' . self::AGGREGATE_LINE . '` is the one required status check that follows PARTS'];
        }

        foreach ($aggregates as $id => $job) {
            if (! str_contains(YamlValue::string($job, 'if'), 'always()') || GithubWorkflowReader::needs($job) !== $checks) {
                $violations[] = 'aggregate job `' . $id . '` must need exactly the checks job (' . implode(', ', $checks) . ') and run with `always()`: a skipped or cancelled part would pass it otherwise';
            }

            $results = array_map(static fn (array $step): mixed => YamlValue::at($step, 'env', 'RESULT'), GithubWorkflowReader::steps($job));

            if (! array_any($checks, static fn (string $check): bool => in_array('${{ needs.' . $check . '.result }}', $results, true))) {
                $violations[] = 'aggregate job `' . $id . '` does not read RESULT from `needs.<checks job>.result`';
            }
        }

        return $violations;
    }

    /**
     * @param array<string, array<array-key, mixed>> $jobs
     * @return list<string>
     */
    private function testRules(array $jobs): array
    {
        $violations = [];

        foreach (['backend-tests', 'smoke', ...($this->frontend ? ['frontend-tests'] : [])] as $id) {
            if (! isset($jobs[$id])) {
                $violations[] = 'no job `' . $id . '`: it is a required status check, and a deleted job is a check nobody waits for';

                continue;
            }

            if (array_diff(['pull_request', 'push'], GithubWorkflowReader::events($jobs[$id]['if'] ?? null)) !== []) {
                $violations[] = 'job `' . $id . '` does not run on every pull request and every push to a deploying branch: a skipped job reports success';
            }
        }

        $backend = $jobs['backend-tests'] ?? [];

        if ($backend !== [] && ! in_array($this->backendTestCommand, GithubWorkflowReader::lines($backend), true)) {
            $violations[] = 'job `backend-tests` does not run exactly `' . $this->backendTestCommand . '`';
        }

        if ($backend !== [] && ! array_any($this->expanded(GithubWorkflowReader::lines($backend)), static fn (string $line): bool => str_starts_with($line, GithubWorkflowReader::CHECKS . ' --coverage '))) {
            $violations[] = 'job `backend-tests` has no line `' . GithubWorkflowReader::CHECKS . ' --coverage <report>`, in the job or in the composer script it runs: the coverage of the run is held at the committed floor';
        }

        if ($this->smoke instanceof GithubSmokeRules && isset($jobs['smoke'])) {
            $violations = [...$violations, ...$this->smoke->violations($jobs['smoke'])];
        }

        return [...$violations, ...$this->serviceRules($jobs)];
    }

    /**
     * The lines of a job with each `composer <script>` line followed by the commands of that script.
     *
     * @param list<string> $lines
     * @return list<string>
     */
    private function expanded(array $lines): array
    {
        $expanded = [];

        foreach ($lines as $line) {
            $expanded[] = $line;

            if (preg_match('/^composer\s+(\S+)$/', $line, $script) === 1) {
                array_push($expanded, ...($this->composerScripts[$script[1]] ?? []));
            }
        }

        return $expanded;
    }

    /**
     * @param array<string, array<array-key, mixed>> $jobs
     * @param list<string> $crons
     * @return list<string>
     */
    private function scheduledRules(array $jobs, array $crons): array
    {
        $scheduled = array_filter($jobs, static fn (array $job): bool => in_array(self::SCHEDULED_LINE, GithubWorkflowReader::lines($job), true));

        if ($scheduled === []) {
            return ['no job runs exactly `' . self::SCHEDULED_LINE . '`: add it to the scheduled job'];
        }

        $violations = [];

        foreach ($scheduled as $id => $job) {
            if (GithubWorkflowReader::condition($job) !== "github.event_name == 'schedule'") {
                $violations[] = 'job `' . $id . "` runs the scheduled checks on another condition than `github.event_name == 'schedule'`";
            }

            $mutation = array_filter(GithubWorkflowReader::steps($job), static fn (array $step): bool => in_array(self::MUTATION_LINE, GithubWorkflowReader::stepLines($step), true));

            if ($mutation === []) {
                $violations[] = 'job `' . $id . '` does not run `' . self::MUTATION_LINE . '`: the whole-tree mutation run belongs to the scheduled job';
            }

            foreach ($mutation as $step) {
                $condition = trim(YamlValue::string($step, 'if'));

                if ($condition !== '' && ! array_any($crons, static fn (string $cron): bool => $condition === "github.event.schedule == '" . $cron . "'")) {
                    $violations[] = 'the mutation step of job `' . $id . '` has the condition `' . $condition . "`: only `github.event.schedule == '<cron>'` with a cron of the workflow may hold it back";
                }
            }
        }

        return $violations;
    }

    /**
     * The jobs that boot the application (the test run, the smoke run and the scheduled job) need the database service where the
     * project has a database.
     *
     * @param array<string, array<array-key, mixed>> $jobs
     * @return list<string>
     */
    private function serviceRules(array $jobs): array
    {
        $violations = [];

        foreach ($this->databaseImage === '' ? [] : $jobs as $id => $job) {
            if (! in_array($id, ['backend-tests', 'smoke'], true) && ! in_array(self::SCHEDULED_LINE, GithubWorkflowReader::lines($job), true)) {
                continue;
            }

            if (! array_any(YamlValue::map($job, 'services'), fn (mixed $service): bool => YamlValue::string($service, 'image') === $this->databaseImage)) {
                $violations[] = 'job `' . $id . '` has no database service with the image `' . $this->databaseImage . '`: the tests and the smoke run use the production engine, not what the runner happens to hold';
            }
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    private function crons(array $workflow): array
    {
        return array_values(array_filter(array_map(static fn (mixed $entry): string => YamlValue::string($entry, 'cron'), YamlValue::map(GithubWorkflowReader::triggers($workflow), 'schedule')), static fn (string $cron): bool => $cron !== ''));
    }
}
