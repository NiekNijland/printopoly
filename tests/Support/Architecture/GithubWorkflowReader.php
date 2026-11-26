<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * What the GitHub guard reads out of a parsed workflow: the triggers, the jobs, the lines of the `run:` steps and the events a job
 * runs on. No rule is in here. Ported from the kit's reference project (reference-project/tests/Support/Architecture).
 */
final class GithubWorkflowReader
{
    public const string CHECKS = 'bash scripts/checks.sh';

    public const array EVENTS = ['pull_request', 'push', 'schedule'];

    public static function cancelsEveryEvent(mixed $cancel): bool
    {
        return $cancel === true || (is_string($cancel) && ! str_contains($cancel, 'pull_request'));
    }

    public static function writes(mixed $permissions): bool
    {
        return is_string($permissions) ? str_starts_with($permissions, 'write') : (is_array($permissions) && in_array('write', $permissions, true));
    }

    /**
     * A YAML 1.1 parser reads the key `on` as `true`: both spellings are read.
     *
     * @param array<array-key, mixed> $workflow
     * @return array<array-key, mixed>
     */
    public static function triggers(array $workflow): array
    {
        $on = $workflow['on'] ?? $workflow[1] ?? [];

        if (is_string($on)) {
            return [$on => null];
        }

        if (! is_array($on)) {
            return [];
        }

        return array_is_list($on) ? array_fill_keys(array_filter($on, is_string(...)), null) : $on;
    }

    /**
     * The events of the three the kit reads (pull_request, push, schedule) that start the workflow.
     *
     * @param array<array-key, mixed> $workflow
     * @return list<string>
     */
    public static function startingEvents(array $workflow): array
    {
        return array_values(array_intersect(self::EVENTS, array_map(strval(...), array_keys(self::triggers($workflow)))));
    }

    /**
     * @param array<array-key, mixed> $workflow
     * @return array<string, array<array-key, mixed>>
     */
    public static function jobs(array $workflow): array
    {
        $jobs = [];

        foreach (YamlValue::map($workflow, 'jobs') as $id => $job) {
            if (is_array($job)) {
                $jobs[(string) $id] = $job;
            }
        }

        return $jobs;
    }

    /**
     * @param array<array-key, mixed> $workflow
     */
    public static function runsChecks(array $workflow): bool
    {
        return array_any(self::jobs($workflow), static fn (array $job): bool => array_any(self::lines($job), static fn (string $line): bool => str_starts_with($line, self::CHECKS)));
    }

    /**
     * @param array<array-key, mixed> $job
     */
    public static function condition(array $job): string
    {
        return trim(YamlValue::string($job, 'if'));
    }

    /**
     * The events a job runs on, read from its `if`: an `if` this reader cannot read counts as every event.
     *
     * @return list<string>
     */
    public static function events(mixed $condition): array
    {
        if (! is_string($condition)) {
            return self::EVENTS;
        }

        if (preg_match("/^github\\.event_name == '(\\w+)'$/", trim($condition), $match) === 1) {
            return [$match[1]];
        }

        if (preg_match("/^github\\.event_name != '(\\w+)'$/", trim($condition), $match) === 1) {
            return array_values(array_diff(self::EVENTS, [$match[1]]));
        }

        return self::EVENTS;
    }

    /**
     * Every line of every `run:` of a job, a block split on its newlines.
     *
     * @param array<array-key, mixed> $job
     * @return list<string>
     */
    public static function lines(array $job): array
    {
        $lines = [];

        foreach (self::steps($job) as $step) {
            array_push($lines, ...self::stepLines($step));
        }

        return $lines;
    }

    /**
     * @param array<array-key, mixed> $step
     * @return list<string>
     */
    public static function stepLines(array $step): array
    {
        return array_values(array_filter(array_map(trim(...), explode("\n", YamlValue::string($step, 'run'))), static fn (string $line): bool => $line !== ''));
    }

    /**
     * Every string value of a parsed document, keys left out: where a placeholder or a secret can hide, a comment cannot.
     *
     * @return list<string>
     */
    public static function strings(mixed $value): array
    {
        if (is_string($value)) {
            return [$value];
        }

        $strings = [];

        foreach (is_array($value) ? $value : [] as $item) {
            array_push($strings, ...self::strings($item));
        }

        return $strings;
    }

    /**
     * @param array<array-key, mixed> $job
     * @return list<string>
     */
    public static function needs(array $job): array
    {
        return YamlValue::strings($job, 'needs');
    }

    /**
     * @param array<array-key, mixed> $job
     * @return list<array<array-key, mixed>>
     */
    public static function steps(array $job): array
    {
        return array_values(array_filter(YamlValue::map($job, 'steps'), is_array(...)));
    }

    /**
     * The environment a step runs with: the job's `env` with the step's own over it.
     *
     * @param array<array-key, mixed> $job
     * @param array<array-key, mixed> $step
     * @return array<array-key, mixed>
     */
    public static function environment(array $job, array $step): array
    {
        return [...YamlValue::map($job, 'env'), ...YamlValue::map($step, 'env')];
    }

    /**
     * @param array<array-key, mixed> $job
     * @return list<array<array-key, mixed>>
     */
    public static function stepsUsing(array $job, string $action): array
    {
        return array_values(array_filter(self::steps($job), static fn (array $step): bool => str_starts_with(YamlValue::string($step, 'uses'), $action . '@')));
    }

    /**
     * @param array<array-key, mixed> $job
     * @return array<array-key, mixed>
     */
    public static function checkout(array $job): array
    {
        return self::stepsUsing($job, 'actions/checkout')[0] ?? [];
    }
}
