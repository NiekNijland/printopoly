<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class ModuleLayoutGuard
{
    private const string WORD = LayoutTable::WORD;

    /**
     * @param string $source the folder of the application code, relative to the root
     * @param string $guide the guide with the tables of roots, layers and module folders, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $source,
        private string $guide,
    ) {
    }

    public function table(): LayoutTable
    {
        return LayoutTable::read(GuideText::of($this->root, $this->guide));
    }

    /**
     * @return list<string> one "place <path>" or "name <path>" per class that is not where the tables of the guide put it, sorted
     */
    public function findings(): array
    {
        $table = $this->table();

        if ($table->moduleRoot === null || $table->modules === [] || $table->layers === [] || $table->folders === []) {
            return ['guide ' . $this->guide];
        }

        $findings = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->source) as $file) {
            $path = mb_substr($file, mb_strlen($this->root) + 1);
            $finding = $this->inPath($table, $path);

            if ($finding !== null) {
                $findings[] = $finding . ' ' . $path;
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
        return array_map(fn (string $finding): string => match (explode(' ', $finding, 2)[0]) {
            'guide' => $this->guide . ' holds no table of roots (Wortel, Bevat, Leden) with a `<folder>/<Domain>` row and its modules, of layers (Laag, Bevat, Naam) or of module folders (Map, Bevat, Naam): the guard is generated from them.',
            'place' => $finding . ': no row of the tables in ' . $this->guide . ' holds a class here. A class of a module sits in <Domain>/<Folder>/[<Subdomain>/]<Class>.php of a listed module, an adapter in <System>/[<Folder>/]<Class>.php of a listed system, every other class in a layer of the table.',
            default => $finding . ': the folder is right and the name is not: follow the Name column (Naam) of its row in ' . $this->guide . '.',
        }, $findings);
    }

    private function inPath(LayoutTable $table, string $path): ?string
    {
        $word = self::WORD;

        if ($table->moduleRoot !== null && str_starts_with($path, $table->moduleRoot . '/')) {
            $inModule = mb_substr($path, mb_strlen($table->moduleRoot) + 1);

            if (preg_match("#^({$word})/({$word})(?:/{$word})?/({$word})\\.php$#", $inModule, $match) !== 1 || ! in_array($match[1], $table->modules, true) || ! isset($table->folders[$match[2]])) {
                return 'place';
            }

            return LayoutTable::nameFits($table->folders[$match[2]], $match[3]) ? null : 'name';
        }

        if ($table->adapterRoot !== null && str_starts_with($path, $table->adapterRoot . '/')) {
            $inAdapter = mb_substr($path, mb_strlen($table->adapterRoot) + 1);

            return preg_match("#^({$word})(?:/{$word})?/{$word}\\.php$#", $inAdapter, $match) === 1 && in_array($match[1], $table->adapters, true) ? null : 'place';
        }

        foreach ($table->layers as $layer => $rule) {
            if (preg_match(LayoutTable::pattern($layer), $path, $match) === 1 && ($rule['exact'] === null || $rule['exact'] === $match[1])) {
                return LayoutTable::nameFits($rule, $match[1]) ? null : 'name';
            }
        }

        return 'place';
    }
}
