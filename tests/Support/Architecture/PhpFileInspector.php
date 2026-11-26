<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use InvalidArgumentException;
use Override;
use PhpParser\Node;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\GroupUse;
use PhpParser\Node\Stmt\Use_;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor;
use PhpParser\NodeVisitorAbstract;
use Tests\Support\RecursiveFiles;

final class PhpFileInspector
{
    private const string CLASS_STRING = '/^\\\\?[A-Za-z_][A-Za-z0-9_]*(\\\\[A-Za-z_][A-Za-z0-9_]*)+$/';

    /** @var array<string, list<Stmt>> */
    private array $parsed = [];

    /**
     * @return list<string> absolute paths of the PHP files below the directory, sorted
     */
    public function phpFiles(string $directory): array
    {
        throw_unless(is_dir($directory), InvalidArgumentException::class, 'The directory ' . $directory . ' does not exist: a guard over a missing folder would pass without reading a file');

        $files = [];

        foreach (RecursiveFiles::in($directory) as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }

        sort($files, SORT_STRING);

        return $files;
    }

    /**
     * @return list<Stmt>
     */
    public function statements(string $file): array
    {
        return $this->parsed[$file] ??= PhpSource::statements($file);
    }

    /**
     * @return array{inside: list<string>, outside: list<string>}
     */
    public function referencedNamesByFactory(string $file): array
    {
        $visitor = new class() extends NodeVisitorAbstract
        {
            /** @var list<string> */
            public array $inside = [];

            /** @var list<string> */
            public array $outside = [];

            private int $depth = 0;

            #[Override]
            public function enterNode(Node $node): ?int
            {
                if ($node instanceof Use_ || $node instanceof GroupUse) {
                    return NodeVisitor::DONT_TRAVERSE_CHILDREN;
                }

                if ($this->isFactory($node)) {
                    $this->depth++;
                }

                if ($node instanceof Name) {
                    $this->record(ltrim($node->toString(), '\\'));
                }

                if ($node instanceof String_ && preg_match(PhpFileInspector::classString(), $node->value) === 1) {
                    $this->record(ltrim($node->value, '\\'));
                }

                return null;
            }

            #[Override]
            public function leaveNode(Node $node): null
            {
                if ($this->isFactory($node)) {
                    $this->depth--;
                }

                return null;
            }

            private function isFactory(Node $node): bool
            {
                return $node instanceof ClassMethod && $node->isStatic() && str_starts_with($node->name->toString(), 'from');
            }

            private function record(string $name): void
            {
                if ($this->depth > 0) {
                    $this->inside[] = $name;
                } else {
                    $this->outside[] = $name;
                }
            }
        };

        new NodeTraverser($visitor)->traverse($this->statements($file));

        return ['inside' => array_values(array_unique($visitor->inside)), 'outside' => array_values(array_unique($visitor->outside))];
    }

    public static function classString(): string
    {
        return self::CLASS_STRING;
    }
}
