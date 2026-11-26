<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * The service containers of a job (point 10 of 04-guards.md C4).
 *
 * Decision (this project): the jobs run on the runner (setup-php and setup-node), not in a container image, so a service is
 * reached on 127.0.0.1 through the port it publishes, not by its name as DB_HOST. The guard asserts that form instead:
 *   - every service publishes a port when its job runs on the runner, and has a `--health-cmd`, so the job waits for it;
 *   - every service image has a tag and none is `latest` (the kit's digest rule has the service image as its one exception:
 *     the database image is compared with DATABASE_IMAGE as written, and `mongo:8` and `redis:alpine` are the project's choice);
 *   - the database service (the image of a database engine) is DATABASE_IMAGE, carries the password variable of its engine
 *     where the engine needs one and the health tool of its engine, and the job's environment points at it
 *     (`127.0.0.1:<published port>` on the runner, DB_HOST = the service name in a container job).
 */
final readonly class GithubServiceRules
{
    /**
     * @param string $databaseImage DATABASE_IMAGE of scripts/kit-config.sh, compared as written; empty where the project has no database
     */
    public function __construct(private string $databaseImage)
    {
    }

    /**
     * @param array<array-key, mixed> $job
     * @return list<string>
     */
    public function inJob(string $where, array $job): array
    {
        $violations = [];

        foreach (YamlValue::map($job, 'services') as $name => $service) {
            $violations = [...$violations, ...$this->inService($where . ', service `' . $name . '`', $job, (string) $name, YamlValue::map($service))];
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $job
     * @param array<array-key, mixed> $service
     * @return list<string>
     */
    private function inService(string $label, array $job, string $name, array $service): array
    {
        $violations = [];
        $image = YamlValue::string($service, 'image');
        $options = YamlValue::string($service, 'options');
        $onRunner = ! isset($job['container']);

        if (preg_match('/^[^@\s]+(:[A-Za-z0-9._-]+|@sha256:[0-9a-f]{64})$/', $image) !== 1 || preg_match('/:latest$/', $image) === 1) {
            $violations[] = $label . ' image `' . $image . '` has no tag or the moving tag `latest`: name the major version (`mongo:8`)';
        }

        if (! str_contains($options, '--health-cmd')) {
            $violations[] = $label . ' has no `--health-cmd` in its options: the job must wait for the service, or its first step races the start';
        }

        if ($onRunner && YamlValue::strings($service, 'ports') === []) {
            $violations[] = $label . ' publishes no port and the job runs on the runner: it cannot reach the service. Add `ports: [<port>:<port>]`';
        }

        if (DatabaseEngine::of($image) === '') {
            return $violations;
        }

        return [...$violations, ...$this->databaseRules($label, $job, $name, $service, $onRunner)];
    }

    /**
     * @param array<array-key, mixed> $job
     * @param array<array-key, mixed> $service
     * @return list<string>
     */
    private function databaseRules(string $label, array $job, string $name, array $service, bool $onRunner): array
    {
        $violations = [];
        $engine = DatabaseEngine::of($this->databaseImage);
        $env = YamlValue::map($service, 'env');
        $options = YamlValue::string($service, 'options');
        $passwordKeys = DatabaseEngine::passwordKeys($engine);

        if (YamlValue::string($service, 'image') !== $this->databaseImage) {
            $violations[] = $label . ' image is not DATABASE_IMAGE of kit-config.sh (`' . $this->databaseImage . '`): the tests run on the production engine and major version. Write `image: ' . $this->databaseImage . '`';
        }

        if ($passwordKeys !== [] && ! array_any($passwordKeys, static fn (string $key): bool => isset($env[$key]))) {
            $violations[] = $label . ' has no password variable of its engine (' . $engine . ': ' . implode(', ', $passwordKeys) . '): the official image exits at start, and the job fails at "Initialize containers"';
        }

        $tools = DatabaseEngine::healthTools($engine);

        if ($tools !== [] && ! array_any($tools, static fn (string $tool): bool => str_contains($options, $tool))) {
            $violations[] = $label . ' has no health check of its engine (' . implode(' or ', $tools) . '): the job must wait for the database, and a check from another engine never passes';
        }

        if (! $onRunner && YamlValue::string($job, 'env', 'DB_HOST') !== $name) {
            $violations[] = $label . ' is not the DB_HOST of its job: a container job reaches a service by its name. Set DB_HOST: ' . $name;
        }

        if ($onRunner && ! $this->pointsAt($job, YamlValue::strings($service, 'ports'))) {
            $violations[] = $label . ' is not reached by its job: no value of the job `env` names 127.0.0.1:<published port> (for example MONGODB_URI: mongodb://127.0.0.1:27017)';
        }

        return $violations;
    }

    /**
     * @param array<array-key, mixed> $job
     * @param list<string> $ports
     */
    private function pointsAt(array $job, array $ports): bool
    {
        $values = array_filter(YamlValue::map($job, 'env'), is_string(...));

        foreach ($ports as $port) {
            $published = explode(':', $port)[0];

            if (array_any($values, static fn (string $value): bool => preg_match('#(127\.0\.0\.1|localhost):' . preg_quote($published, '#') . '\b#', $value) === 1)) {
                return true;
            }
        }

        return false;
    }
}
