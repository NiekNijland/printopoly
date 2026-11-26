<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Stmt;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\ParserFactory;
use RuntimeException;

final class PhpSource
{
    /**
     * @return list<Stmt>
     */
    public static function parse(string $source): array
    {
        $statements = new ParserFactory()->createForNewestSupportedVersion()->parse($source) ?? [];

        return array_values(array_filter(
            new NodeTraverser(new NameResolver())->traverse($statements),
            static fn (Node $node): bool => $node instanceof Stmt,
        ));
    }

    /**
     * @return list<Stmt>
     */
    public static function statements(string $file): array
    {
        throw_unless(is_file($file), RuntimeException::class, 'the file ' . $file . ' does not exist: a guard that reads a named file fails when it is renamed, it does not read an empty tree');

        return self::parse((string) file_get_contents($file));
    }
}
