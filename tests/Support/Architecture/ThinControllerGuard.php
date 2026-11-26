<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Illuminate\Support\Facades\Facade;
use PhpParser\Node;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\NullableType;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\Class_;
use PhpParser\NodeFinder;

final readonly class ThinControllerGuard
{
    private const array WRITES = [
        'save', 'savequietly', 'update', 'updatequietly', 'updateorcreate', 'updateorinsert', 'firstorcreate', 'create', 'createquietly', 'createmany',
        'delete', 'deletequietly', 'forcedelete', 'forcedeletequietly', 'restore', 'restorequietly', 'attach', 'sync', 'syncwithoutdetaching',
        'detach', 'updateexistingpivot', 'insert', 'insertorignore', 'insertgetid', 'upsert', 'increment', 'decrement', 'incrementeach',
        'decrementeach', 'lockforupdate', 'sharedlock', 'transaction', 'begintransaction',
    ];

    /**
     * @param string $folder the controller folder, relative to the root
     * @param list<string> $databaseFacades the facades whose every call is the database (`Illuminate\Support\Facades\DB`)
     * @param list<string> $collaboratorFolders namespace segments (`\Actions\`) whose classes a controller calls with a write name
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $folder,
        private array $databaseFacades,
        private array $collaboratorFolders,
    ) {
    }

    /**
     * @return list<string> one `<call>` per write, lock, transaction or database facade call of the source, in source order
     */
    public function inSource(string $source): array
    {
        return array_column($this->calls(PhpSource::parse($source)), 0);
    }

    /**
     * @return list<string> one `path::<call>#<n>` per write of a controller, the n-th of that call in the file, sorted
     */
    public function findings(): array
    {
        $findings = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->folder) as $file) {
            $path = mb_substr($file, mb_strlen($this->root) + 1);
            $seen = [];

            foreach ($this->calls($this->inspector->statements($file)) as [$call]) {
                $seen[$call] = ($seen[$call] ?? 0) + 1;
                $findings[] = $path . '::' . $call . '#' . $seen[$call];
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
        return array_map(static fn (string $finding): string => $finding . ': a write, lock or transaction in a controller. Move it into an action of the module and call the action.', $findings);
    }

    /**
     * @param list<Stmt> $statements
     * @return list<array{string, int}>
     */
    private function calls(array $statements): array
    {
        $finder = new NodeFinder();
        $collaborators = $this->collaborators($finder, $statements);
        $found = [];

        $calls = $finder->find($statements, static fn (Node $node): bool => $node instanceof MethodCall || $node instanceof NullsafeMethodCall || $node instanceof StaticCall);

        foreach ($calls as $call) {
            if (! $call instanceof MethodCall && ! $call instanceof NullsafeMethodCall && ! $call instanceof StaticCall) {
                continue;
            }

            if ($call instanceof StaticCall && $call->class instanceof Name && in_array($this->facade($call->class), $this->databaseFacades, true)) {
                $found[] = [$call->class->getLast() . '::', $call->getStartLine()];

                continue;
            }

            $name = $call->name instanceof Identifier ? $call->name->toLowerString() : '';

            if (! in_array($name, self::WRITES, true) || (! $call instanceof StaticCall && $this->callsCollaborator($call->var, $collaborators))) {
                continue;
            }

            $found[] = [$name . '()', $call->getStartLine()];
        }

        usort($found, static fn (array $a, array $b): int => $a[1] <=> $b[1]);

        return $found;
    }

    /**
     * @param list<Stmt> $statements
     * @return list<string> the properties whose class is an action or a service of a module
     */
    private function collaborators(NodeFinder $finder, array $statements): array
    {
        $collaborators = [];

        foreach ($finder->findInstanceOf($statements, Class_::class) as $class) {
            foreach ($class->getProperties() as $property) {
                foreach ($this->isCollaborator($property->type) ? $property->props : [] as $item) {
                    $collaborators[] = $item->name->toString();
                }
            }

            foreach ($class->getMethod('__construct')->params ?? [] as $param) {
                if ($param->flags !== 0 && $param->var instanceof Variable && is_string($param->var->name) && $this->isCollaborator($param->type)) {
                    $collaborators[] = $param->var->name;
                }
            }
        }

        return $collaborators;
    }

    private function facade(Name $class): string
    {
        $name = ltrim($class->toString(), '\\');
        $alias = Facade::defaultAliases()->get($name);

        return ! str_contains($name, '\\') && is_string($alias) ? $alias : $name;
    }

    private function isCollaborator(?Node $type): bool
    {
        $type = $type instanceof NullableType ? $type->type : $type;

        return $type instanceof Name && array_any($this->collaboratorFolders, static fn (string $folder): bool => str_contains('\\' . $type->toString(), $folder));
    }

    /**
     * @param list<string> $collaborators
     */
    private function callsCollaborator(Node $receiver, array $collaborators): bool
    {
        return $receiver instanceof PropertyFetch
            && $receiver->var instanceof Variable
            && $receiver->var->name === 'this'
            && $receiver->name instanceof Identifier
            && in_array($receiver->name->toString(), $collaborators, true);
    }
}
