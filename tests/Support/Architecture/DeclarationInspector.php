<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use InvalidArgumentException;
use PhpParser\Node;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\Enum_;
use PhpParser\Node\Stmt\GroupUse;
use PhpParser\Node\Stmt\Interface_;
use PhpParser\Node\Stmt\Trait_;
use PhpParser\NodeFinder;
use Tests\Support\RecursiveFiles;

final class DeclarationInspector
{
    /** @var array<string, list<Node\Stmt>> */
    private array $parsed = [];

    /**
     * @return list<string> absolute paths of the PHP files below the directory; a missing directory throws unless it may be absent
     */
    public function phpFiles(string $directory, bool $mayBeAbsent = false): array
    {
        if (! is_dir($directory)) {
            if ($mayBeAbsent) {
                return [];
            }

            throw new InvalidArgumentException('The directory ' . $directory . ' does not exist: a guard over a missing folder would pass without reading a file');
        }

        $files = [];

        foreach (RecursiveFiles::in($directory) as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }

        sort($files);

        return $files;
    }

    /**
     * @return list<Node\Stmt> the statements of a file with every name resolved, parsed once per inspector
     */
    public function statements(string $file): array
    {
        return $this->parsed[$file] ??= PhpSource::statements($file);
    }

    /**
     * @return list<string> every class name a file names outside its import statements, and every string that is a qualified class name
     */
    public function referencedNames(string $file): array
    {
        $names = [];

        foreach ($this->statements($file) as $statement) {
            foreach (new NodeFinder()->findInstanceOf($statement, Name::class) as $name) {
                $names[] = ltrim($name->toString(), '\\');
            }

            foreach (new NodeFinder()->findInstanceOf($statement, String_::class) as $string) {
                if (preg_match('/^\\\\?[A-Za-z_][A-Za-z0-9_]*(\\\\[A-Za-z_][A-Za-z0-9_]*)+$/', $string->value) === 1) {
                    $names[] = ltrim($string->value, '\\');
                }
            }

            foreach (new NodeFinder()->findInstanceOf($statement, GroupUse::class) as $group) {
                foreach ($group->uses as $use) {
                    $names[] = ltrim($group->prefix->toString() . '\\' . $use->name->toString(), '\\');
                }
            }
        }

        return array_values(array_unique($names));
    }

    /**
     * @return array<string, list<string>> every class, trait, interface and enum a file declares, with the names it refers to
     */
    public function declaredTypes(string $file): array
    {
        $types = [];

        foreach ($this->declarations($file) as $declaration) {
            if ($declaration->namespacedName === null) {
                continue;
            }

            $related = [];

            foreach (new NodeFinder()->findInstanceOf($declaration, Name::class) as $name) {
                $related[] = ltrim($name->toString(), '\\');
            }

            $types[$declaration->namespacedName->toString()] = array_values(array_unique($related));
        }

        return $types;
    }

    /**
     * @return list<ClassLike> the named classes, traits, interfaces and enums of a file; an anonymous class is no declaration
     */
    public function declarations(string $file): array
    {
        $declarations = [];

        foreach ($this->statements($file) as $statement) {
            $found = new NodeFinder()->find(
                $statement,
                static fn (Node $node): bool => ($node instanceof Class_ && $node->name instanceof Identifier) || $node instanceof Trait_ || $node instanceof Interface_ || $node instanceof Enum_,
            );

            foreach ($found as $declaration) {
                if ($declaration instanceof ClassLike) {
                    $declarations[] = $declaration;
                }
            }
        }

        return $declarations;
    }
}
