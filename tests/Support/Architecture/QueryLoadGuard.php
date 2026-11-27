<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr\Assign;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Foreach_;
use PhpParser\NodeFinder;

/**
 * The guard over how many documents a query reads (docs/guards/queries.md): a cleanup class streams its documents and
 * never loads a whole collection into PHP (`load-all`), and no loop over the documents of a query reads with a query per
 * pass (`query-in-loop`), also not through a method of the same class that the loop calls.
 */
final readonly class QueryLoadGuard
{
    private const string LOAD_ALL_FIX = 'a cleanup class loads every matching document at once. Stream them with chunkById() where they are deleted, lazyById() for a read, or bound the query with limit()';

    private const string LOOP_FIX = 'a loop over the documents of a query reads with a query per pass (an N+1). Read what every pass needs in one query before the loop and look it up by key in the loop';

    private const array LOAD_ALL = ['get', 'all', 'pluck'];

    private const array BOUNDS = ['limit', 'take', 'forpage', 'first'];

    private const array READS = [
        'get', 'first', 'firstorfail', 'find', 'findorfail', 'findmany', 'sole', 'pluck', 'value', 'count', 'exists', 'doesntexist',
        'sum', 'min', 'max', 'avg', 'lazy', 'lazybyid', 'cursor', 'chunk', 'chunkbyid', 'each', 'eachbyid', 'paginate', 'simplepaginate',
    ];

    /**
     * @param string $folder the folder of the application code, relative to the root
     * @param string $cleanupFolder the name of the folder of a module that holds its cleanup classes (`Support`)
     * @param string $cleanupSuffix the end of the name of a cleanup class (`Cleanup`)
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $folder,
        private string $cleanupFolder,
        private string $cleanupSuffix,
    ) {
    }

    /**
     * @return list<string> one `path:line rule call: reason` per finding, sorted
     */
    public function violations(): array
    {
        $violations = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->folder) as $file) {
            $path = mb_substr($file, mb_strlen($this->root) + 1);
            $cleanup = basename(dirname($file)) === $this->cleanupFolder && str_ends_with(basename($file, '.php'), $this->cleanupSuffix);

            foreach ($this->findings($this->inspector->statements($file), $cleanup) as $finding) {
                $violations[] = $path . ':' . $finding;
            }
        }

        sort($violations, SORT_NATURAL);

        return $violations;
    }

    /**
     * @param bool $cleanup whether the source is a cleanup class, where every query streams
     * @return list<string> one `line rule call: reason` per finding of the source, in source order
     */
    public function inSource(string $source, bool $cleanup): array
    {
        return $this->findings(PhpSource::parse($source), $cleanup);
    }

    /**
     * @param list<Stmt> $statements
     * @return list<string>
     */
    private function findings(array $statements, bool $cleanup): array
    {
        $finder = new NodeFinder();
        $found = [];

        if ($cleanup) {
            foreach ($finder->find($statements, $this->loadsAll(...)) as $call) {
                if ($call instanceof MethodCall || $call instanceof NullsafeMethodCall || $call instanceof StaticCall) {
                    $found[] = [$call->getStartLine(), 'load-all ' . $this->callName($call) . '()'];
                }
            }
        }

        foreach ($finder->findInstanceOf($statements, ClassLike::class) as $class) {
            $methods = [];

            foreach ($class->getMethods() as $method) {
                $methods[$method->name->toLowerString()] = $method;
            }

            foreach ($methods as $method) {
                $fromQuery = $this->queryVariables($finder, $method);

                foreach ($finder->findInstanceOf($method->stmts ?? [], Foreach_::class) as $loop) {
                    $overDocuments = $this->readQuery($finder, [$loop->expr]) !== null || ($loop->expr instanceof Variable && in_array($loop->expr->name, $fromQuery, true));
                    $query = $overDocuments ? $this->queryIn($finder, $loop->stmts, $methods, []) : null;

                    if ($query !== null) {
                        $found[] = [$loop->getStartLine(), 'query-in-loop ' . $query];
                    }
                }
            }
        }

        usort($found, static fn (array $a, array $b): int => $a[0] <=> $b[0]);

        return array_map(static fn (array $finding): string => $finding[0] . ' ' . $finding[1] . ': ' . (str_starts_with($finding[1], 'load-all') ? self::LOAD_ALL_FIX : self::LOOP_FIX), $found);
    }

    /**
     * @return list<string> the variables of the method that are assigned the result of a query
     */
    private function queryVariables(NodeFinder $finder, ClassMethod $method): array
    {
        $names = [];

        foreach ($finder->findInstanceOf($method->stmts ?? [], Assign::class) as $assign) {
            if ($assign->var instanceof Variable && is_string($assign->var->name) && $this->readQuery($finder, [$assign->expr]) !== null) {
                $names[] = $assign->var->name;
            }
        }

        return $names;
    }

    /**
     * The first read of a query in the nodes: a read call (`get()`, `first()`, `count()`, ...) on a chain that starts at
     * `<Class>::query()`. A write (`update()`, `delete()`) is no read.
     *
     * @param array<Node> $nodes
     */
    private function readQuery(NodeFinder $finder, array $nodes): ?string
    {
        foreach ($finder->findInstanceOf($nodes, MethodCall::class) as $call) {
            if (! in_array($this->callName($call), self::READS, true)) {
                continue;
            }

            $receiver = $call->var;

            while ($receiver instanceof MethodCall || $receiver instanceof NullsafeMethodCall) {
                $receiver = $receiver->var;
            }

            if ($receiver instanceof StaticCall && $receiver->class instanceof Name && $this->callName($receiver) === 'query') {
                return $receiver->class->getLast() . '::query()->' . $this->callName($call) . '()';
            }
        }

        return null;
    }

    /**
     * The first read of a query the nodes run: in them, or in a method of the class they call on `$this`.
     *
     * @param array<Node> $nodes
     * @param array<string, ClassMethod> $methods
     * @param list<string> $seen the methods already followed
     */
    private function queryIn(NodeFinder $finder, array $nodes, array $methods, array $seen): ?string
    {
        $query = $this->readQuery($finder, $nodes);

        if ($query !== null) {
            return $query;
        }

        foreach ($finder->findInstanceOf($nodes, MethodCall::class) as $call) {
            if (! $call->var instanceof Variable || $call->var->name !== 'this' || ! $call->name instanceof Identifier) {
                continue;
            }

            $name = $call->name->toLowerString();

            if (! isset($methods[$name]) || in_array($name, $seen, true)) {
                continue;
            }

            $query = $this->queryIn($finder, $methods[$name]->stmts ?? [], $methods, [...$seen, $name]);

            if ($query !== null) {
                return $query . ' via $this->' . $methods[$name]->name->toString() . '()';
            }
        }

        return null;
    }

    /**
     * A `get()`, `pluck()` or `all()` on a chain that starts at `<Class>::query()` and has no `limit()`, `take()`,
     * `forPage()` or `first()`, or a static `<Class>::all()`.
     */
    private function loadsAll(Node $node): bool
    {
        if ($node instanceof StaticCall) {
            return $node->class instanceof Name && $this->callName($node) === 'all';
        }

        if (! $node instanceof MethodCall && ! $node instanceof NullsafeMethodCall || ! in_array($this->callName($node), self::LOAD_ALL, true)) {
            return false;
        }

        $receiver = $node->var;

        while ($receiver instanceof MethodCall || $receiver instanceof NullsafeMethodCall) {
            if (in_array($this->callName($receiver), self::BOUNDS, true)) {
                return false;
            }

            $receiver = $receiver->var;
        }

        return $receiver instanceof StaticCall && $receiver->class instanceof Name && $this->callName($receiver) === 'query';
    }

    private function callName(MethodCall|NullsafeMethodCall|StaticCall $call): string
    {
        return $call->name instanceof Identifier ? $call->name->toLowerString() : '';
    }
}
