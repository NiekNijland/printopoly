<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Name;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\NodeFinder;

final class SourceClasses
{
    /**
     * @return list<array{path: string, class: ClassLike}> every named class, interface, trait and enum below the folder, with its path relative to the root
     */
    public static function in(PhpFileInspector $inspector, string $root, string $folder): array
    {
        $classes = [];

        foreach ($inspector->phpFiles($root . '/' . $folder) as $file) {
            foreach (new NodeFinder()->findInstanceOf($inspector->statements($file), ClassLike::class) as $class) {
                if ($class->namespacedName instanceof Name) {
                    $classes[] = ['path' => mb_substr($file, mb_strlen($root) + 1), 'class' => $class];
                }
            }
        }

        return $classes;
    }

    public static function inFolder(string $path, string $folder): bool
    {
        return in_array($folder, explode('/', dirname($path)), true);
    }

    public static function isConcrete(ClassLike $class): bool
    {
        return $class instanceof Class_ && ! $class->isAbstract();
    }

    public static function shortName(ClassLike $class): string
    {
        return $class->name?->toString() ?? '';
    }

    /**
     * @param list<array{path: string, class: ClassLike}> $classes
     * @return list<string> the class itself and every parent class it reaches through the classes and the autoloader
     */
    public static function lineage(ClassLike $class, array $classes): array
    {
        $parents = [];

        foreach ($classes as $entry) {
            if ($entry['class'] instanceof Class_ && $entry['class']->extends instanceof Name) {
                $parents[(string) $entry['class']->namespacedName] = $entry['class']->extends->toString();
            }
        }

        $name = (string) $class->namespacedName;
        $lineage = [$name];

        while (isset($parents[$name]) && ! in_array($parents[$name], $lineage, true)) {
            $name = $parents[$name];
            $lineage[] = $name;
        }

        $vendor = class_exists($name) ? class_parents($name) : false;

        return $vendor === false ? $lineage : [...$lineage, ...array_values($vendor)];
    }
}
