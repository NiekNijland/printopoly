<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class DataNamingGuard
{
    /**
     * @param string $source the folder of the application code, relative to the root
     * @param string $folder the folder name that holds the DTOs
     * @param string $base the class every DTO extends
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $source,
        private string $folder,
        private string $base,
    ) {
    }

    /**
     * @return list<string> the path of every DTO whose name does not end in `Data`, sorted
     */
    public function findings(): array
    {
        $classes = SourceClasses::in($this->inspector, $this->root, $this->source);
        $findings = [];

        foreach ($classes as ['path' => $path, 'class' => $class]) {
            if (! SourceClasses::isConcrete($class) || str_ends_with(SourceClasses::shortName($class), 'Data')) {
                continue;
            }

            if (SourceClasses::inFolder($path, $this->folder) || in_array($this->base, SourceClasses::lineage($class, $classes), true)) {
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
        return array_map(fn (string $path): string => $path . ': a DTO (a class in ' . $this->folder . ', or a ' . $this->base . ') is named `<X>Data`: rename it.', $findings);
    }
}
