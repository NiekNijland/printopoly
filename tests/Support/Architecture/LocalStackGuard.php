<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Symfony\Component\Yaml\Yaml;

final readonly class LocalStackGuard
{
    private const string VERSION = '\d+(\.\d+){2}';

    private const array INSTALLS = [
        'npm install -g' => '/\bnpm\s+(?:install|i)\s+-g\s+([^\\\\&;|]+)/',
        'npx -y' => '/\bnpx\s+(?:-y|--yes)\s+(\S+)/',
        'composer global require' => '/\bcomposer\s+global\s+require\s+(\S+)/',
        'corepack prepare' => '/\bcorepack\s+prepare\s+(\S+)/',
    ];

    public function __construct(
        private string $root,
        private string $compose,
        private string $workflowDirectory,
        private string $dockerfile,
        private string $nodeVersionFile,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        foreach ([$this->compose, $this->dockerfile, $this->nodeVersionFile] as $file) {
            if (! is_file($this->root . '/' . $file)) {
                return ['the file ' . $file . ' does not exist: the local stack is read from it'];
            }
        }

        $workflows = [];
        $files = glob($this->root . '/' . $this->workflowDirectory . '/*.y*ml');

        foreach (is_array($files) ? $files : [] as $file) {
            $workflows[basename($file)] = (string) file_get_contents($file);
        }

        return $this->inStack(
            (string) file_get_contents($this->root . '/' . $this->compose),
            $workflows,
            (string) file_get_contents($this->root . '/' . $this->dockerfile),
            (string) file_get_contents($this->root . '/' . $this->nodeVersionFile),
        );
    }

    /**
     * @param array<string, string> $workflows the text of each workflow by its file name
     * @return list<string>
     */
    public function inStack(string $compose, array $workflows, string $dockerfile, string $nodeVersion): array
    {
        $ciImages = [];
        $chromeVersions = [];

        foreach ($workflows as $text) {
            foreach (GithubWorkflowReader::jobs(YamlValue::map(Yaml::parse($text))) as $job) {
                foreach (YamlValue::map($job, 'services') as $name => $service) {
                    $ciImages[(string) $name][] = YamlValue::string($service, 'image');
                }
            }

            preg_match_all('/chrome-headless-shell@(\S+)/', $text, $matches);
            array_push($chromeVersions, ...$matches[1]);
        }

        return [
            ...$this->composeRules(YamlValue::map(Yaml::parse($compose), 'services'), $ciImages),
            ...$this->versionRules($dockerfile, trim($nodeVersion), array_values(array_unique($chromeVersions))),
            ...$this->installRules($dockerfile),
        ];
    }

    /**
     * @param array<array-key, mixed> $services
     * @param array<string, list<string>> $ciImages
     * @return list<string>
     */
    private function composeRules(array $services, array $ciImages): array
    {
        $violations = [];

        foreach ($services as $name => $service) {
            $image = YamlValue::string($service, 'image');

            if ($image === '' || YamlValue::at($service, 'build') !== null) {
                continue;
            }

            if (preg_match('/^[^@]+:\d[^:\/]*$|@sha256:[0-9a-f]{64}$/', $image) !== 1) {
                $violations[] = $this->compose . ': the service `' . $name . '` runs the image `' . $image . '`, which names no version: every developer gets another server. Write a version tag, the one CI uses';
            }

            foreach (array_unique($ciImages[(string) $name] ?? []) as $ciImage) {
                if ($ciImage !== $image) {
                    $violations[] = $this->compose . ': the service `' . $name . '` runs `' . $image . '` and CI runs `' . $ciImage . '`: the tests pass on another server than the one you develop on. Use the image of CI';
                }
            }
        }

        return $violations;
    }

    /**
     * @param list<string> $chromeVersions
     * @return list<string>
     */
    private function versionRules(string $dockerfile, string $nodeVersion, array $chromeVersions): array
    {
        $violations = [];
        $node = $this->argument($dockerfile, 'NODE_VERSION');
        $chrome = $this->argument($dockerfile, 'CHROME_VERSION');

        if ($node !== ltrim($nodeVersion, 'v')) {
            $violations[] = $this->dockerfile . ': ARG NODE_VERSION is `' . $node . '` and ' . $this->nodeVersionFile . ' says `' . $nodeVersion . '`: the image runs another Node than CI. Write the version of ' . $this->nodeVersionFile;
        }

        foreach ($chromeVersions as $version) {
            if ($version !== $chrome) {
                $violations[] = $this->dockerfile . ': ARG CHROME_VERSION is `' . $chrome . '` and CI installs chrome-headless-shell@' . $version . ': the PDFs differ between the image and CI. Write the version of CI';
            }
        }

        if (! str_contains($dockerfile, '--version | grep -F "$CHROME_VERSION"')) {
            $violations[] = $this->dockerfile . ': the build does not check the Chrome it installed against CHROME_VERSION (`chrome-headless-shell --version | grep -F "$CHROME_VERSION"`): a new Playwright brings another Chrome unnoticed';
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    private function installRules(string $dockerfile): array
    {
        $violations = [];

        foreach (self::INSTALLS as $command => $pattern) {
            preg_match_all($pattern, $dockerfile, $matches);

            foreach ($matches[1] as $packages) {
                foreach (explode(' ', (string) preg_replace('/\s+/', ' ', trim($packages))) as $package) {
                    if (preg_match('/^.[^@:]*[@:](' . self::VERSION . '|\$[A-Z_]+)$/', $package) !== 1) {
                        $violations[] = $this->dockerfile . ': `' . $command . ' ' . $package . '` installs no exact version: write `' . $package . '@<version>`, or the argument that holds it';
                    }
                }
            }
        }

        if (preg_match('/\bapt-get\s+install\s+-y\s+nodejs(?!=)/', $dockerfile) === 1) {
            $violations[] = $this->dockerfile . ': `apt-get install -y nodejs` installs the newest Node of the major: write `nodejs=$NODE_VERSION-1nodesource1`';
        }

        if (str_contains($dockerfile, 'getcomposer.org/installer') && preg_match('/--filename=composer\s+--version=' . self::VERSION . '/', $dockerfile) !== 1) {
            $violations[] = $this->dockerfile . ': the composer installer runs without `--version=<version>`: every build gets the newest Composer';
        }

        return $violations;
    }

    private function argument(string $dockerfile, string $name): string
    {
        return preg_match('/^ARG\s+' . $name . '=(\S+)$/m', $dockerfile, $match) === 1 ? $match[1] : '';
    }
}
