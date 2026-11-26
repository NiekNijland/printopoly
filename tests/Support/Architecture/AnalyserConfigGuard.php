<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * Point 15 of the CI contract (04-guards.md C4): the analyser's paths name every folder of SOURCE_PATHS and TEST_PATHS of the
 * ratchet script and the public entry folder, the configs include the bleeding-edge file, and each extension is included by name
 * (no extension installer that loads whatever is installed).
 *
 * Decision (this project): an entry of SOURCE_PATHS that is a pattern, not a folder (`resources/views?`, the Blade templates the
 * ratchet rows read), is no PHP the analyser reads, so it is not asked of the analyser's paths.
 */
final readonly class AnalyserConfigGuard
{
    /**
     * @param list<string> $configFiles the analyser configs, together read as one set of paths
     * @param array<string, list<string>> $folderFiles a folder of the ratchet rows that the analyser reads through these files, never as a folder
     */
    public function __construct(
        private array $configFiles,
        private string $ratchetScript,
        private string $composerManifest,
        private string $publicFolder,
        private array $folderFiles,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $configs = [];

        foreach ([...$this->configFiles, $this->ratchetScript, $this->composerManifest] as $file) {
            if (! is_file($file)) {
                return ['the file ' . $file . ' does not exist: the analyser contract is read from it'];
            }
        }

        foreach ($this->configFiles as $file) {
            $configs[basename($file)] = (string) file_get_contents($file);
        }

        return $this->inConfigs($configs, (string) file_get_contents($this->ratchetScript), (string) file_get_contents($this->composerManifest));
    }

    /**
     * @param array<string, string> $configs the analyser configs by file name
     * @return list<string>
     */
    public function inConfigs(array $configs, string $ratchetScript, string $composerJson): array
    {
        $text = implode("\n", $configs);
        $paths = [];
        $violations = [];

        preg_match_all('/^\s*paths:\s*\n((?:[ \t]*-[^\n]*\n?)+)/m', $text, $blocks);

        foreach ($blocks[1] as $block) {
            preg_match_all('/^[ \t]*-\s*(\S+)/m', $block, $entries);
            array_push($paths, ...array_map(static fn (string $path): string => rtrim($path, '/'), $entries[1]));
        }

        foreach ([...$this->folders($ratchetScript, 'SOURCE_PATHS'), ...$this->folders($ratchetScript, 'TEST_PATHS'), $this->publicFolder] as $folder) {
            if (array_key_exists($folder, $this->folderFiles)) {
                array_push($violations, ...$this->filesOfFolder($folder, $this->folderFiles[$folder], $paths));

                continue;
            }

            if (! in_array($folder, $paths, true)) {
                $violations[] = 'the analyser configs do not name the folder `' . $folder . '` under `paths`: a folder the ratchet rows count is a folder the analyser reads. Add `- ' . $folder . '`';
            }
        }

        if (! str_contains($text, 'phpstan/conf/bleedingEdge.neon')) {
            $violations[] = "the analyser configs do not include vendor/phpstan/phpstan/conf/bleedingEdge.neon: the next major's rules run now";
        }

        if (array_key_exists('phpstan/extension-installer', YamlValue::map(json_decode($composerJson, true, flags: JSON_THROW_ON_ERROR), 'require-dev'))) {
            $violations[] = 'composer.json requires phpstan/extension-installer: an extension is included by name in the config, so a package cannot add rules unseen. Remove it and include each extension.neon';
        }

        return $violations;
    }

    /**
     * @param list<string> $files
     * @param list<string> $paths
     * @return list<string>
     */
    private function filesOfFolder(string $folder, array $files, array $paths): array
    {
        $violations = [];

        if (in_array($folder, $paths, true)) {
            $violations[] = 'the analyser configs name the folder `' . $folder . '`, which holds generated files: name ' . implode(' and ', array_map(static fn (string $file): string => '`' . $file . '`', $files)) . ' instead';
        }

        foreach ($files as $file) {
            if (! in_array($file, $paths, true)) {
                $violations[] = 'the analyser configs do not name `' . $file . '` under `paths`: the folder `' . $folder . '` is read through its files. Add `- ' . $file . '`';
            }
        }

        return $violations;
    }

    /**
     * @return list<string> the folders of a comma-separated path variable of the ratchet script, patterns left out
     */
    private function folders(string $ratchetScript, string $variable): array
    {
        if (preg_match('/^' . $variable . '="([^"]*)"/m', $ratchetScript, $match) !== 1) {
            return [];
        }

        return array_values(array_filter(array_map(trim(...), explode(',', $match[1])), static fn (string $folder): bool => $folder !== '' && preg_match('/[?*\[\]()|]/', $folder) !== 1));
    }
}
