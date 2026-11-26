<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * The rules about a workflow file as a whole: its triggers, its concurrency group, its permissions, its default shell, a
 * placeholder or a secret anywhere in it, the release comment after every pinned action, and (for a file the owner has the guard
 * harden) the hazards of events that carry secrets.
 */
final readonly class GithubWorkflowRules
{
    /**
     * @param list<string> $deployBranches the branches that deploy: `push.branches` covers each of them
     * @param list<string> $allowedTriggers owner exceptions: triggers that are no check (`workflow_run`, `workflow_dispatch`)
     */
    public function __construct(
        private array $deployBranches,
        private array $allowedTriggers,
    ) {
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    public function inKitWorkflow(array $workflow): array
    {
        return [...$this->triggerRules($workflow), ...$this->settingRules($workflow), ...$this->contentRules($workflow)];
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    public static function hazards(array $workflow): array
    {
        $triggers = GithubWorkflowReader::triggers($workflow);
        $violations = [];

        if (array_key_exists('pull_request_target', $triggers)) {
            $violations[] = "pull_request_target is used: it runs with secrets, and the pull request's own scripts would run in it. Use pull_request";
        }

        if (array_key_exists('workflow_run', $triggers) && array_any(GithubWorkflowReader::jobs($workflow), static fn (array $job): bool => preg_match('/head_sha|head_branch|head\.ref|pull_request/', json_encode(YamlValue::map(GithubWorkflowReader::checkout($job), 'with'), JSON_THROW_ON_ERROR)) === 1)) {
            $violations[] = 'a workflow_run workflow checks out the code of the pull request that triggered it: it runs with secrets. Check out the default branch';
        }

        $secrets = self::secretsIn($workflow);

        if ((array_key_exists('pull_request', $triggers) || array_key_exists('schedule', $triggers)) && $secrets !== []) {
            $violations[] = 'a workflow that a pull request or the schedule starts reads a secret (`' . $secrets[0] . '`): a same-repository pull request runs its own copy of the file. Move the secret to a workflow that only a push to a deploying branch starts';
        }

        return $violations;
    }

    /**
     * Every `uses:` pinned to a commit sha carries the release it stands for as a comment (`# v7.0.1`): the YAML parser drops
     * comments, so this rule reads the text of the file.
     *
     * @return list<string>
     */
    public static function releaseComments(string $yaml): array
    {
        $violations = [];

        foreach (explode("\n", $yaml) as $line) {
            if (preg_match('/^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/', $line, $match) !== 1 || str_starts_with($match[1], './')) {
                continue;
            }

            if (preg_match('/#\s*v\d/', $match[2]) !== 1) {
                $violations[] = '`uses: ' . $match[1] . '` has no comment naming its release: write `# vX.Y.Z` after the sha, so a reader and the dependency bot see which release the sha is';
            }
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    private function triggerRules(array $workflow): array
    {
        $on = GithubWorkflowReader::triggers($workflow);
        $violations = [];

        foreach (array_keys($on) as $trigger) {
            if (! in_array($trigger, [...GithubWorkflowReader::EVENTS, ...$this->allowedTriggers], true)) {
                $violations[] = 'the trigger `' . $trigger . '` is not one of pull_request, push, schedule: a check nobody has to run is a report (an owner exception is the allowedTriggers argument). Remove the trigger';
            }
        }

        foreach (GithubWorkflowReader::EVENTS as $event) {
            if (! array_key_exists($event, $on)) {
                $violations[] = 'the workflow has no `' . $event . '` trigger: add it to `on:`';
            }
        }

        return [...$violations, ...$this->pullRequestRules($on), ...$this->pushRules($on), ...$this->scheduleRules($on)];
    }

    /**
     * @param array<array-key, mixed> $on
     * @return list<string>
     */
    private function pullRequestRules(array $on): array
    {
        $pullRequest = YamlValue::map($on, 'pull_request');
        $violations = [];

        foreach (['paths', 'paths-ignore', 'branches', 'branches-ignore'] as $filter) {
            if (isset($pullRequest[$filter])) {
                $violations[] = 'pull_request has `' . $filter . '`: the checks of a pull request have no filter (a pull request that targets a parent branch of a stack matches no `branches` list either). Remove it';
            }
        }

        $types = array_key_exists('types', $pullRequest) ? YamlValue::strings($pullRequest, 'types') : ['opened', 'synchronize', 'reopened'];

        foreach (['opened', 'synchronize', 'reopened', 'edited'] as $type) {
            if (! in_array($type, $types, true)) {
                $violations[] = 'pull_request.types lacks `' . $type . '`: `edited` re-runs the checks after a retarget, the others are the default. Write types: [opened, synchronize, reopened, edited]';
            }
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $on
     * @return list<string>
     */
    private function pushRules(array $on): array
    {
        $push = YamlValue::map($on, 'push');
        $violations = [];

        foreach ($this->deployBranches as $branch) {
            if (! in_array($branch, YamlValue::strings($push, 'branches'), true)) {
                $violations[] = 'push.branches does not list the deploying branch ' . $branch . ': add it';
            }
        }

        if (isset($push['paths']) || isset($push['paths-ignore'])) {
            $violations[] = 'push has a path filter: the checks of a deploying branch have none. Remove it';
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $on
     * @return list<string>
     */
    private function scheduleRules(array $on): array
    {
        if (! array_any(YamlValue::map($on, 'schedule'), static fn (mixed $entry): bool => trim(YamlValue::string($entry, 'cron')) !== '')) {
            return ['the schedule trigger has no cron: add `- cron: <minute hour * * *>` for the daily scheduled run'];
        }

        return [];
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    private function settingRules(array $workflow): array
    {
        $violations = [];
        $concurrency = $workflow['concurrency'] ?? null;
        $group = YamlValue::string($concurrency, 'group');

        if (! is_array($concurrency) || $group === '') {
            $violations[] = 'the workflow has no concurrency group: every push to a pull request leaves its older run going. Add the group of ci/github-actions.yml';
        } elseif (! str_contains($group, 'github.event_name') || ! str_contains($group, 'pull_request.number')) {
            $violations[] = 'the concurrency group `' . $group . '` does not hold `github.event_name` and the pull request number: one constant group cancels every other pull request, and a group on the ref alone makes a push run and a pull request run cancel each other';
        } elseif (GithubWorkflowReader::cancelsEveryEvent($concurrency['cancel-in-progress'] ?? false)) {
            $violations[] = "concurrency cancels runs of every event: only a pull request may cancel its older run, a push to a deploying branch is never cancelled. Write cancel-in-progress: \${{ github.event_name == 'pull_request' }}";
        }

        if (! isset($workflow['permissions'])) {
            $violations[] = 'the workflow has no top-level `permissions`: set contents: read';
        }

        if (GithubWorkflowReader::writes($workflow['permissions'] ?? null) || array_any(GithubWorkflowReader::jobs($workflow), static fn (array $job): bool => GithubWorkflowReader::writes($job['permissions'] ?? null))) {
            $violations[] = 'a permission is `write`: a check job reads (contents: read, and actions: read where the dashboard asks the run history)';
        }

        if (YamlValue::at($workflow, 'defaults', 'run', 'shell') !== 'bash') {
            $violations[] = 'the workflow does not set `defaults.run.shell: bash`: the default shell has no pipefail, so a failing command in a pipe passes';
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    private function contentRules(array $workflow): array
    {
        $violations = [];

        foreach (GithubWorkflowReader::strings($workflow) as $text) {
            if (preg_match(CiSafetyGuard::PLACEHOLDER, $text, $match) === 1) {
                $violations[] = 'the workflow still holds a placeholder (`' . $match[0] . "`): replace it with the project's value, in a run line, the cron, an image or a setting";
            }
        }

        $secrets = self::secretsIn($workflow);

        if ($secrets !== []) {
            $violations[] = 'the workflow reads a secret (`' . $secrets[0] . "`): the jobs run the pull request's own scripts, so no secret belongs in this file (the token of a job is `github.token`)";
        }

        return array_values(array_unique($violations));
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return list<string> the `secrets.X` references other than the workflow token
     */
    private static function secretsIn(array $workflow): array
    {
        $found = [];

        foreach (GithubWorkflowReader::strings($workflow) as $text) {
            preg_match_all('/secrets\.(?!GITHUB_TOKEN\b)[A-Za-z0-9_]+|secrets\[/', $text, $match);
            array_push($found, ...$match[0]);
        }

        return array_values(array_unique($found));
    }
}
