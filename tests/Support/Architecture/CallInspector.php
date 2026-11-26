<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Illuminate\Support\Facades\Exceptions;
use InvalidArgumentException;
use PhpParser\Node;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Throw_;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Stmt\Catch_;
use PhpParser\NodeFinder;
use Tests\Support\RecursiveFiles;

final class CallInspector
{
    /** Resolved names: statements() runs NameResolver, so a class named Exception in another namespace is not broad. */
    private const array BROAD_EXCEPTIONS = ['Throwable', 'Exception', 'Error', 'ErrorException', 'RuntimeException', 'LogicException'];

    /** @var array<string, list<Node\Stmt>> */
    private array $parsed = [];

    /** @var array<string, list<array{kind: string, line: int, classLine: int, name: string, written: string, class: string|null, receiver: string|null, arguments: list<string>}>> */
    private static array $calls = [];

    /**
     * @return list<int>
     */
    public function swallowedBroadCatchLines(string $file): array
    {
        $lines = [];

        foreach ($this->statements($file) as $statement) {
            foreach (new NodeFinder()->findInstanceOf($statement, Catch_::class) as $catch) {
                $broad = array_filter($catch->types, static fn (Name $type): bool => in_array($type->toString(), self::BROAD_EXCEPTIONS, true)) !== [];

                if ($broad && ! $this->reportsOrRethrows($catch)) {
                    $lines[] = $catch->getStartLine();
                }
            }
        }

        sort($lines);

        return array_values(array_unique($lines));
    }

    /**
     * A directory that does not exist is an error, not an empty tree: a real-tree case over a renamed or missing folder
     * must fail instead of passing without having read a file. A caller that walks a list of trees where some may be
     * absent passes `mayBeAbsent: true`.
     *
     * @return list<string> absolute paths of the PHP files below the directory
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
     * Every function, method, nullsafe method and static call of a file, kept per file for the next test that reads it. `written` is the callee as it stands in the source (a leading backslash
     * included), `class` the resolved class of a static call, `receiver` a short description of what a method is called on (`$request`, `->container`,
     * `request()` for a function call, `->request()` for a method call, `::request()` for a static call), `line` the line of the called name and
     * `classLine` the line of the class a static call names, or of the call a method is called on.
     *
     * @return list<array{kind: string, line: int, classLine: int, name: string, written: string, class: string|null, receiver: string|null, arguments: list<string>}>
     */
    public function callsIn(string $file): array
    {
        // The key is the content, not the modification time: two writes inside one second (a test that rewrites a file) must not read the first parse.
        $key = $file . '@' . md5_file($file);

        return self::$calls[$key] ??= $this->calls((string) file_get_contents($file));
    }

    /**
     * @return list<array{kind: string, line: int, classLine: int, name: string, written: string, class: string|null, receiver: string|null, arguments: list<string>}>
     */
    public function calls(string $source): array
    {
        return PhpCallReader::calls($source);
    }

    private function reportsOrRethrows(Catch_ $catch): bool
    {
        return new NodeFinder()->findFirst($catch->stmts, static function (Node $node): bool {
            $name = match (true) {
                $node instanceof FuncCall && $node->name instanceof Name => $node->name->toString(),
                ($node instanceof MethodCall || $node instanceof NullsafeMethodCall || $node instanceof StaticCall) && $node->name instanceof Identifier => $node->name->toString(),
                default => null,
            };

            return $node instanceof Throw_
                || $name === 'rescue'
                || ($name !== null && str_starts_with($name, 'report'))
                || ($node instanceof StaticCall && $node->class instanceof Name && $node->class->toString() === Exceptions::class)
                || ($node instanceof MethodCall && $name === 'fail' && $node->var instanceof Variable && $node->var->name === 'this');
        }) instanceof Node;
    }

    /**
     * @return list<Node\Stmt>
     */
    private function statements(string $file): array
    {
        return $this->parsed[$file] ??= PhpSource::statements($file);
    }
}
