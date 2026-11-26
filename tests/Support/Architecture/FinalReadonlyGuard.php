<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Stmt\Class_;

final readonly class FinalReadonlyGuard
{
    /**
     * @param string $source the folder of the application code, relative to the root
     * @param list<string> $folders the folder names whose concrete classes are `final readonly`
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $source,
        private array $folders,
    ) {
    }

    /**
     * @return list<string> the path of every concrete class in one of the folders that is not `final readonly`, sorted
     */
    public function findings(): array
    {
        $findings = [];

        foreach (SourceClasses::in($this->inspector, $this->root, $this->source) as ['path' => $path, 'class' => $class]) {
            if (! SourceClasses::isConcrete($class) || ! array_any($this->folders, static fn (string $folder): bool => SourceClasses::inFolder($path, $folder))) {
                continue;
            }

            if (! $class instanceof Class_ || ! $class->isFinal() || ! $class->isReadonly()) {
                $findings[] = $path;
            }
        }

        $findings = array_values(array_unique($findings));
        sort($findings, SORT_STRING);

        return $findings;
    }

    /**
     * @param list<string> $findings
     * @return list<string>
     */
    public function explain(array $findings): array
    {
        return array_map(fn (string $path): string => $path . ': a class in ' . implode(' or ', $this->folders) . ' is not `final readonly`: declare it `final readonly class`, with its dependencies in the constructor.', $findings);
    }
}
