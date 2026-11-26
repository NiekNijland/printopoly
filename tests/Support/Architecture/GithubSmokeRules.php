<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * The smoke run of the GitHub form (points 10 and 17 of 04-guards.md C4): it boots the stack with the production drivers and
 * runs its browser case in a browser it installed. The kit leaves the drivers half of point 10 to a port; this guard reads them
 * from the environment of the step that boots the stack.
 */
final readonly class GithubSmokeRules
{
    private const array LOCAL_ENVIRONMENTS = ['', 'local', 'testing'];

    /**
     * @param string $bootCommand the text of the run line that boots the stack (`php artisan serve`)
     * @param string $smokeCommand the text of the run line of the smoke suite
     * @param string $browserInstall the text of the run line that installs the browser, with its pinned build
     * @param string $browserCommand the text of the run line that runs the browser case
     * @param array<string, string> $drivers the production drivers the boot step sets (CACHE_STORE => redis)
     */
    public function __construct(
        private string $bootCommand,
        private string $smokeCommand,
        private string $browserInstall,
        private string $browserCommand,
        private array $drivers,
    ) {
    }

    /**
     * @param array<array-key, mixed> $smoke the smoke job
     * @return list<string>
     */
    public function violations(array $smoke): array
    {
        $violations = [];
        $lines = GithubWorkflowReader::lines($smoke);

        foreach ([$this->smokeCommand => 'the smoke suite', $this->browserInstall => 'the browser install', $this->browserCommand => 'the browser case'] as $text => $what) {
            if (! array_any($lines, static fn (string $line): bool => str_contains($line, $text))) {
                $violations[] = 'job `smoke` has no line with `' . $text . '` (' . $what . '): the smoke run of a project with a frontend boots the stack and renders in a real browser';
            }
        }

        $boots = array_filter(GithubWorkflowReader::steps($smoke), fn (array $step): bool => array_any(GithubWorkflowReader::stepLines($step), fn (string $line): bool => str_contains($line, $this->bootCommand)));

        if ($boots === []) {
            return [...$violations, 'job `smoke` has no step that runs `' . $this->bootCommand . '`: the smoke suite runs against a booted stack'];
        }

        foreach ($boots as $step) {
            $violations = [...$violations, ...$this->driverRules(GithubWorkflowReader::environment($smoke, $step))];
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $env
     * @return list<string>
     */
    private function driverRules(array $env): array
    {
        $violations = [];

        foreach ($this->drivers as $key => $driver) {
            if (YamlValue::string($env, $key) !== $driver) {
                $violations[] = 'the step of job `smoke` that boots the stack does not set ' . $key . ': ' . $driver . ': the smoke run boots the production drivers';
            }
        }

        if (in_array(YamlValue::string($env, 'APP_ENV'), self::LOCAL_ENVIRONMENTS, true)) {
            $violations[] = 'the step of job `smoke` that boots the stack runs with APP_ENV `' . YamlValue::string($env, 'APP_ENV') . '`: set a deployed environment (staging or production), so the production branches of the code run';
        }

        return $violations;
    }
}
