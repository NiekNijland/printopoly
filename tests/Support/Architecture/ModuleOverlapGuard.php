<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class ModuleOverlapGuard
{
    /**
     * @param string $source the folder of the application code, relative to the root
     * @param string $guide the guide with the layout tables, relative to the root
     */
    public function __construct(
        private string $root,
        private string $source,
        private string $guide,
    ) {
    }

    /**
     * @return list<string> the modules of the guide, the folders under the module root, and the folders of the source that no table names yet
     */
    public function domains(): array
    {
        $table = LayoutTable::read(GuideText::of($this->root, $this->guide));
        $known = [...array_keys($table->folders), ...$this->firstFolders($table)];
        $domains = $table->modules;

        if ($table->moduleRoot !== null && is_dir($this->root . '/' . $table->moduleRoot)) {
            $domains = [...$domains, ...$this->folders($this->root . '/' . $table->moduleRoot)];
        }

        foreach ($this->folders($this->root . '/' . $this->source) as $folder) {
            if (! in_array($folder, $known, true)) {
                $domains[] = $folder;
            }
        }

        $domains = array_values(array_unique($domains));
        sort($domains, SORT_STRING);

        return $domains;
    }

    /**
     * @param list<string> $domains
     * @return list<string> "<A> overlaps <B>" per domain that is a plural or a prefixed form of another, sorted
     */
    public function inDomains(array $domains): array
    {
        $findings = [];

        foreach ($domains as $domain) {
            foreach ($domains as $other) {
                if ($domain === $other) {
                    continue;
                }

                $stems = array_unique([$other, str_ends_with($other, 's') ? mb_substr($other, 0, -1) : $other]);
                $plurals = [$other . 's', $other . 'es', str_ends_with($other, 'y') ? mb_substr($other, 0, -1) . 'ies' : $other . 's'];
                $prefixed = array_filter($stems, static fn (string $stem): bool => preg_match('/^' . preg_quote($stem, '/') . '[A-Z]/', $domain) === 1);

                if ($prefixed !== [] || in_array($domain, $plurals, true)) {
                    $findings[] = $domain . ' overlaps ' . $other;
                }
            }
        }

        $findings = array_values(array_unique($findings));
        sort($findings, SORT_STRING);

        return $findings;
    }

    /**
     * @return list<string>
     */
    public function findings(): array
    {
        return $this->inDomains($this->domains());
    }

    /**
     * @param list<string> $findings
     * @return list<string>
     */
    public function explain(array $findings): array
    {
        return array_map(static function (string $finding): string {
            [$domain, $other] = explode(' overlaps ', $finding, 2);

            return $finding . ': one module per domain. Fold ' . $domain . ' into ' . $other . ', or name it for a different domain.';
        }, $findings);
    }

    /**
     * @return list<string> the first folder under the source of every root and layer of the table
     */
    private function firstFolders(LayoutTable $table): array
    {
        $paths = [$table->moduleRoot, $table->adapterRoot, ...array_keys($table->layers)];
        $first = [];

        foreach ($paths as $path) {
            if ($path !== null && str_starts_with($path, $this->source . '/')) {
                $first[] = explode('/', mb_substr($path, mb_strlen($this->source) + 1))[0];
            }
        }

        return $first;
    }

    /**
     * @return list<string>
     */
    private function folders(string $directory): array
    {
        $folders = glob($directory . '/*', GLOB_ONLYDIR);

        return array_values(array_map(basename(...), $folders === false ? [] : $folders));
    }
}
