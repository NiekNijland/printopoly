<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * What every job of a workflow file the guard reads must satisfy, whatever it runs: the time it may take, the runner label, the
 * toolchain, the service containers, the pins, the checkout, the commands. The workflow-level rules and the rules about the kit's
 * own jobs are in GithubWorkflowRules and GithubChecksRules.
 *
 * Decisions (this project) where the kit's point cannot hold as written:
 *   - Point 7, the job image by digest: the jobs run on the runner with setup-php and setup-node, no `container:` (the owner's
 *     choice for this repository). The pinned toolchain is asserted instead: the runner label names a release (not `*-latest`),
 *     every setup-php step names an exact PHP version and every setup-node step names `node-version-file` or an exact
 *     version. A `container:` that is added later is still read by the kit's rules: digest and options.
 *   - Point 7, a downloaded binary with its checksum: a `curl` to 127.0.0.1 or localhost is a probe of the stack the job booted,
 *     not a download. A tool run with `npx --yes` (the Chrome of the smoke run) names an exact version of the package; npx checks
 *     the package against the registry's integrity hash, and the browser it installs is pinned by its build number. No
 *     sha256 is asserted for that browser.
 *   - Point 8: `timeout-minutes` is at most `maxTimeoutMinutes`; `timeoutCeilings` names a job that may run longer (the scheduled
 *     job runs the whole-tree mutation run).
 */
final readonly class GithubJobRules
{
    private const array CONTAINER_OPTIONS = ['--user', '--cpus', '--memory', '--shm-size'];

    /**
     * @param list<string> $writingLines run lines an owner exception allows to write
     * @param array<string, int> $timeoutCeilings a ceiling per job id that replaces maxTimeoutMinutes for that job
     */
    public function __construct(
        private GithubServiceRules $services,
        private array $writingLines,
        private int $maxTimeoutMinutes,
        private array $timeoutCeilings = [],
    ) {
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    public function inWorkflow(array $workflow): array
    {
        $violations = [];
        $jobs = GithubWorkflowReader::jobs($workflow);

        foreach ($jobs as $id => $job) {
            $violations = [...$violations, ...$this->inJob($id, $job)];
            $name = $job['name'] ?? null;

            if (is_string($name) && $name !== $id && (isset($jobs[$name]) || count(array_filter($jobs, static fn (array $other): bool => ($other['name'] ?? null) === $name)) > 1)) {
                $violations[] = 'job `' . $id . '` is named `' . $name . '`, which is the name of another job: two jobs reporting one check name make the required check ambiguous';
            }
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $job
     * @return list<string>
     */
    private function inJob(string $id, array $job): array
    {
        $where = 'job `' . $id . '`';
        $violations = [];
        $timeout = $job['timeout-minutes'] ?? null;
        $ceiling = $this->timeoutCeilings[$id] ?? $this->maxTimeoutMinutes;

        if (! is_int($timeout)) {
            $violations[] = $where . " has no integer timeout-minutes (GitHub's default is 360 minutes): set one";
        } elseif ($timeout < 1 || $timeout > $ceiling) {
            $violations[] = $where . ' has timeout-minutes ' . $timeout . ', above the ' . $ceiling . ' the guard allows: a hung job holds a runner for that long';
        }

        if (isset($job['runs-on']) && preg_match('/latest/', json_encode($job['runs-on'], JSON_THROW_ON_ERROR)) === 1) {
            $violations[] = $where . ' runs on a moving label (`*-latest`): name the release, for example ubuntu-24.04';
        }

        $uses = YamlValue::string($job, 'uses');

        if ($uses !== '' && ! $this->pinned($uses)) {
            $violations[] = $where . ' calls the workflow `' . $uses . '`, which is not pinned to a full commit sha';
        }

        return [
            ...$violations,
            ...$this->containerRules($where, $job),
            ...$this->services->inJob($where, $job),
            ...$this->stepRules($where, $job),
            ...$this->downloadRules($where, $job),
        ];
    }

    /**
     * @param array<array-key, mixed> $job
     * @return list<string>
     */
    private function containerRules(string $where, array $job): array
    {
        $violations = [];
        $container = $job['container'] ?? null;
        $image = is_array($container) ? YamlValue::string($container, 'image') : (is_string($container) ? $container : null);

        if (is_string($image) && ! str_contains($image, '@sha256:')) {
            $violations[] = $where . ' runs in a container that is not pinned by digest: write `image: <name>@sha256:<digest>`';
        }

        $options = trim(YamlValue::string($container, 'options'));

        $split = $options === '' ? [] : preg_split('/\s+(?=-)/', $options);

        foreach (is_array($split) ? $split : [] as $option) {
            if (! array_any(self::CONTAINER_OPTIONS, static fn (string $allowed): bool => str_starts_with($option, $allowed))) {
                $violations[] = $where . ' passes `' . $option . '` to its container: only ' . implode(', ', self::CONTAINER_OPTIONS) . ' are accepted (a privileged or host-networked container weakens the isolation of the checks)';
            }
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $job
     * @return list<string>
     */
    private function stepRules(string $where, array $job): array
    {
        $violations = [];

        if (($job['continue-on-error'] ?? false) !== false || trim(YamlValue::string($job, 'if')) === 'false') {
            $violations[] = $where . ' may fail or is switched off (`continue-on-error` or `if: false`): nothing is allowed to fail. Remove it';
        }

        foreach (GithubWorkflowReader::steps($job) as $step) {
            $violations = [...$violations, ...$this->stepPinRules($where, $step)];

            if (($step['continue-on-error'] ?? false) !== false || in_array(trim(YamlValue::string($step, 'if')), ['false', 'always()'], true)) {
                $violations[] = $where . ', a step may fail or is forced on (`continue-on-error`, `if: false`, `if: always()`): remove it';
            }
        }

        return [...$violations, ...new CiSafetyGuard('', $this->writingLines)->inCommands(GithubWorkflowReader::lines($job))];
    }

    /**
     * @param array<array-key, mixed> $step
     * @return list<string>
     */
    private function stepPinRules(string $where, array $step): array
    {
        $violations = [];
        $uses = YamlValue::string($step, 'uses');

        if ($uses !== '' && ! str_starts_with($uses, './') && ! $this->pinned($uses)) {
            $violations[] = $where . ' uses `' . $uses . '`, which is not pinned to a full commit sha: write `<action>@<40-character sha> # vX.Y.Z`';
        }

        if (str_starts_with($uses, 'actions/checkout@')) {
            if (YamlValue::at($step, 'with', 'fetch-depth') !== 0) {
                $violations[] = $where . ' checks out with a shallow clone: set `fetch-depth: 0` (a history-reading task stops working after a few dozen commits)';
            }

            if (YamlValue::at($step, 'with', 'persist-credentials') === false) {
                $violations[] = $where . ' checks out with `persist-credentials: false`: scripts/checks.sh fetches the base with those credentials. Remove it';
            }
        }

        if (str_starts_with($uses, 'shivammathur/setup-php@') && preg_match('/^\d+\.\d+$/', YamlValue::string($step, 'with', 'php-version')) !== 1) {
            $violations[] = $where . " sets up PHP without an exact version: write `php-version: '8.5'` (the job runs on the runner, so this pin is its toolchain)";
        }

        if (str_starts_with($uses, 'actions/setup-node@') && YamlValue::string($step, 'with', 'node-version-file') === '' && preg_match('/^\d+(\.\d+){0,2}$/', YamlValue::string($step, 'with', 'node-version')) !== 1) {
            $violations[] = $where . ' sets up Node without a pinned version: write `node-version-file: .nvmrc`';
        }

        return $violations;
    }

    /**
     * A tool downloaded in a run line is checked against its checksum, and never piped into a shell. A probe of the job's own stack
     * (a URL on 127.0.0.1 or localhost only) is no download; a tool run with `npx --yes` names an exact version.
     *
     * @param array<array-key, mixed> $job
     * @return list<string>
     */
    private function downloadRules(string $where, array $job): array
    {
        $lines = GithubWorkflowReader::lines($job);
        $downloads = array_filter($lines, static fn (string $line): bool => preg_match('/\b(curl|wget)\b/', $line) === 1 && preg_match('#https?://(?!127\.0\.0\.1\b|localhost\b)#', $line) === 1);
        $violations = [];

        if ($downloads !== [] && ! array_any($lines, static fn (string $line): bool => preg_match('/\bsha256sum\s+(-c|--check)\b|\bshasum\s+(-a\s*256\s+)?-c\b/', $line) === 1)) {
            $violations[] = $where . ' downloads a file with curl or wget and checks no checksum (`sha256sum -c`): a downloaded binary is pinned by its version and its checksum';
        }

        foreach ($lines as $line) {
            if (preg_match('/\b(curl|wget)\b.*\|\s*(sudo\s+)?(ba)?sh\b/', $line) === 1) {
                $violations[] = $where . ' pipes a download into a shell: `' . $line . '`. Download, check the checksum, then run';
            }

            if (preg_match('/\bnpx\s+(--yes|-y)\s+(\S+)/', $line, $tool) === 1 && preg_match('/^@?[^@\s]+@\d+\.\d+\.\d+$/', $tool[2]) !== 1) {
                $violations[] = $where . ' runs `' . $tool[2] . '` with npx without an exact version: write `' . $tool[2] . '@<x.y.z>`';
            }
        }

        return $violations;
    }

    private function pinned(string $uses): bool
    {
        return preg_match('/@([0-9a-f]{40}|sha256:[0-9a-f]{64})$/', $uses) === 1;
    }
}
