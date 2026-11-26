<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Symfony\Component\Yaml\Yaml;

/**
 * Point 16 of the CI contract (04-guards.md C4), the dependency-bot half: the bot's config file exists and holds the keys the kit
 * asks for.
 *
 * Decision (this project): Dependabot is kept instead of the kit's Renovate (templates/tool-configs.md, "Dependency bot"). The
 * guard asserts Dependabot's equivalents of the kit's keys: an update entry per package manager of the project (the GitHub
 * Actions entry moves the pinned action shas, what Renovate's pinGitHubActionDigests does), and a commit-message prefix on every
 * entry that starts with the project's ticket and a type, so the bot's commits pass the commit-message check. Renovate's
 * `rangeStrategy: bump` and its "majors off" rule have no checked equivalent here.
 */
final readonly class DependencyBotGuard
{
    /**
     * @param string $ticket the ticket the commit-message check asks for (NOTICKET)
     * @param list<string> $ecosystems the package managers the bot updates (composer, npm, github-actions)
     */
    public function __construct(
        private string $configFile,
        private string $ticket,
        private array $ecosystems,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        if (! is_file($this->configFile)) {
            return ['no dependency-bot config at ' . $this->configFile . ': the bot keeps the packages and the action pins moving'];
        }

        return $this->inConfig((string) file_get_contents($this->configFile));
    }

    /**
     * @return list<string>
     */
    public function inConfig(string $yaml): array
    {
        $config = YamlValue::map(Yaml::parse($yaml));
        $updates = array_values(array_filter(YamlValue::map($config, 'updates'), is_array(...)));
        $violations = [];

        if (YamlValue::at($config, 'version') !== 2) {
            $violations[] = 'the Dependabot config is not `version: 2`';
        }

        foreach ($this->ecosystems as $ecosystem) {
            if (! array_any($updates, static fn (array $update): bool => YamlValue::string($update, 'package-ecosystem') === $ecosystem)) {
                $violations[] = 'the Dependabot config has no update entry for `' . $ecosystem . '`: add one with its schedule and commit-message prefix';
            }
        }

        foreach ($updates as $update) {
            $prefix = YamlValue::string($update, 'commit-message', 'prefix');

            if (preg_match('/^' . preg_quote($this->ticket, '/') . ' [a-z]+(\([a-z0-9-]+\))?$/', $prefix) !== 1) {
                $violations[] = 'the Dependabot entry for `' . YamlValue::string($update, 'package-ecosystem') . '` has the commit-message prefix `' . $prefix . '`: write `' . $this->ticket . " chore(deps)`, so the bot's commits pass the commit-message check";
            }
        }

        return $violations;
    }
}
