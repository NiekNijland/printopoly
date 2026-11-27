<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Symfony\Component\Yaml\Yaml;

final readonly class PhpUnitRunGuard
{
    /**
     * @param list<string> $configs the PHPUnit config files, relative to the root
     * @param array<string, string> $switches the attribute of the config by the option of the command line that it stands for
     */
    public function __construct(
        private string $root,
        private array $configs,
        private string $composerManifest,
        private string $checksScript,
        private string $workflowDirectory,
        private array $switches,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $configs = [];

        foreach ([...$this->configs, $this->composerManifest, $this->checksScript] as $file) {
            if (! is_file($this->root . '/' . $file)) {
                return ['the file ' . $file . ' does not exist: the PHPUnit configs and runs are read from it'];
            }
        }

        foreach ($this->configs as $config) {
            $configs[$config] = (string) file_get_contents($this->root . '/' . $config);
        }

        $runs = [
            $this->composerManifest => array_merge(...array_values(ComposerScripts::of((string) file_get_contents($this->root . '/' . $this->composerManifest)))),
            $this->checksScript => explode("\n", (string) file_get_contents($this->root . '/' . $this->checksScript)),
        ];

        $files = glob($this->root . '/' . $this->workflowDirectory . '/*.y*ml');

        foreach (is_array($files) ? $files : [] as $file) {
            $lines = [];

            foreach (GithubWorkflowReader::jobs(YamlValue::map(Yaml::parseFile($file))) as $job) {
                array_push($lines, ...GithubWorkflowReader::lines($job));
            }

            $runs[$this->workflowDirectory . '/' . basename($file)] = $lines;
        }

        return $this->inProject($configs, $runs);
    }

    /**
     * @param array<string, string> $configs the text of each PHPUnit config by its path
     * @param array<string, list<string>> $runs the command lines of each file that runs PHPUnit, by its path
     * @return list<string>
     */
    public function inProject(array $configs, array $runs): array
    {
        $violations = [];

        foreach ($configs as $path => $text) {
            foreach ($this->switches as $attribute) {
                if (preg_match('/<phpunit\b[^>]*\s' . $attribute . '="true"/', $text) !== 1) {
                    $violations[] = $path . ' does not set ' . $attribute . '="true" on <phpunit>: a run without the option passes what the switch fails. Add the attribute';
                }
            }
        }

        foreach ($runs as $path => $lines) {
            foreach ($lines as $line) {
                $violations = [...$violations, ...$this->inRun($path, $line)];
            }
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    private function inRun(string $path, string $line): array
    {
        if (str_starts_with(ltrim($line), '#') || preg_match('/(^|[\s"]|bin\/)(phpunit|paratest)(\s|"|$)|\bartisan\s+test\b/', $line) !== 1) {
            return [];
        }

        $violations = [];

        foreach (array_keys($this->switches) as $option) {
            if (preg_match('/\s' . preg_quote($option, '/') . '(\s|"|$)/', $line) !== 1) {
                $violations[] = $path . ': the run `' . trim($line) . '` does not pass `' . $option . '`: write the option in every PHPUnit run, so a config that loses it still fails';
            }
        }

        return $violations;
    }
}
