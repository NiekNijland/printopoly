<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class PureLayerGuard
{
    /**
     * @param string $source the folder of the application code, relative to the root
     * @param string $guide the guide with the table of pure layers (Laag, Model of database), relative to the root
     * @param list<string> $databaseNames the names, or prefixes ending in a backslash, of models and the database layer
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $source,
        private string $guide,
        private array $databaseNames,
    ) {
    }

    /**
     * @return array<string, bool> every layer of the guide: a folder name, or a path from the root; true when a static `from*` factory may name a model
     */
    public function layers(): array
    {
        $layers = [];

        foreach (GuideText::table(GuideText::of($this->root, $this->guide), ['Laag', 'Model of database']) as [$layer, $rule]) {
            foreach (GuideText::codeSpans($layer) as $name) {
                $layers[$name] = str_contains($rule, '`from*`');
            }
        }

        return $layers;
    }

    /**
     * @return list<string> the path of every class of a pure layer that names a model or the database layer, sorted
     */
    public function findings(): array
    {
        $layers = $this->layers();

        if ($layers === []) {
            return ['guide ' . $this->guide];
        }

        $findings = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->source) as $file) {
            $path = mb_substr($file, mb_strlen($this->root) + 1);
            $factories = $this->layerOf($path, $layers);

            if ($factories !== null && $this->databaseNamesIn($file, $factories) !== []) {
                $findings[] = $path;
            }
        }

        sort($findings, SORT_STRING);

        return $findings;
    }

    /**
     * @param list<string> $findings
     * @return list<string>
     */
    public function explain(array $findings): array
    {
        $layers = $this->layers();

        return array_map(function (string $path) use ($layers): string {
            if (str_starts_with($path, 'guide ')) {
                return $this->guide . ' holds no table of pure layers (Laag, Model of database): the guard reads the layers from it.';
            }

            $names = $this->databaseNamesIn($this->root . '/' . $path, $this->layerOf($path, $layers) ?? false);

            return $path . ': a pure layer names ' . implode(', ', $names) . '. Hand over what it needs as a scalar, an array or a value object; a DTO names a model only in its static from* factories (' . $this->guide . ').';
        }, $findings);
    }

    /**
     * @param array<string, bool> $layers
     */
    private function layerOf(string $path, array $layers): ?bool
    {
        foreach ($layers as $layer => $factories) {
            $inLayer = str_contains($layer, '/') ? str_starts_with($path, $layer . '/') : SourceClasses::inFolder($path, $layer);

            if ($inLayer) {
                return $factories;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function databaseNamesIn(string $file, bool $factories): array
    {
        $names = $this->inspector->referencedNamesByFactory($file);
        $inside = $factories
            ? array_filter($names['inside'], fn (string $name): bool => $this->isDatabaseName($name) && str_contains($name, '\\Facades\\'))
            : array_filter($names['inside'], $this->isDatabaseName(...));
        $found = array_values(array_unique([...array_filter($names['outside'], $this->isDatabaseName(...)), ...$inside]));
        sort($found, SORT_STRING);

        return $found;
    }

    private function isDatabaseName(string $name): bool
    {
        return array_any($this->databaseNames, static fn (string $prefix): bool => $name === rtrim($prefix, '\\') || (str_ends_with($prefix, '\\') && str_starts_with($name, $prefix)));
    }
}
