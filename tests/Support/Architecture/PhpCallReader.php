<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Arg;
use PhpParser\Node\Expr\ArrayDimFetch;
use PhpParser\Node\Expr\ClassConstFetch;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\New_;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\NullsafePropertyFetch;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PhpParser\NodeFinder;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\ParserFactory;
use PhpParser\PrettyPrinter\Standard;

final class PhpCallReader
{
    /**
     * @return list<array{kind: string, line: int, classLine: int, name: string, written: string, class: string|null, receiver: string|null, arguments: list<string>}>
     */
    public static function calls(string $source): array
    {
        $statements = new NodeTraverser(new NameResolver(null, ['preserveOriginalNames' => true]))->traverse(new ParserFactory()->createForHostVersion()->parse($source) ?? []);
        $printer = new Standard();
        $calls = [];

        $nodes = new NodeFinder()->find(
            $statements,
            static fn (Node $node): bool => $node instanceof FuncCall || $node instanceof MethodCall || $node instanceof NullsafeMethodCall || $node instanceof StaticCall,
        );

        foreach ($nodes as $node) {
            if (! ($node instanceof FuncCall || $node instanceof MethodCall || $node instanceof NullsafeMethodCall || $node instanceof StaticCall)) {
                continue;
            }

            $arguments = [];

            foreach ($node->args as $argument) {
                if ($argument instanceof Arg) {
                    $arguments[] = $printer->prettyPrintExpr($argument->value);
                }
            }

            if ($node instanceof FuncCall) {
                if (! $node->name instanceof Name) {
                    continue;
                }

                $written = self::written($node->name);
                $calls[] = ['kind' => 'function', 'line' => $node->name->getStartLine(), 'classLine' => $node->name->getStartLine(), 'name' => mb_strtolower($node->name->getLast()), 'written' => $written, 'class' => null, 'receiver' => null, 'arguments' => $arguments];

                continue;
            }

            $name = $node->name instanceof Identifier ? $node->name->toString() : '';
            $line = $node->name->getStartLine();

            if ($node instanceof StaticCall) {
                $class = $node->class instanceof Name ? ltrim($node->class->toString(), '\\') : null;
                $calls[] = ['kind' => 'static', 'line' => $line, 'classLine' => $node->class->getStartLine(), 'name' => mb_strtolower($name), 'written' => $node->class instanceof Name ? self::written($node->class) : '', 'class' => $class, 'receiver' => null, 'arguments' => $arguments];

                continue;
            }

            $calls[] = ['kind' => $node instanceof MethodCall ? 'method' : 'nullsafe', 'line' => $line, 'classLine' => self::calleeLine($node->var), 'name' => mb_strtolower($name), 'written' => '', 'class' => null, 'receiver' => self::receiver($node->var), 'arguments' => $arguments];
        }

        usort($calls, static fn (array $a, array $b): int => [$a['line'], $a['classLine']] <=> [$b['line'], $b['classLine']]);

        return $calls;
    }

    /**
     * Every `new <class>(...)` of a file with a named class, and every `throw_if()` or `throw_unless()` that names its exception as `<class>::class`
     * (the helper builds it): `class` the resolved name, `written` the name as it stands in the source, `line` the line of the class name and
     * `arguments` the printed arguments of the exception.
     *
     * @return list<array{line: int, class: string, written: string, arguments: list<string>}>
     */
    public static function instantiations(string $source): array
    {
        $statements = new NodeTraverser(new NameResolver(null, ['preserveOriginalNames' => true]))->traverse(new ParserFactory()->createForHostVersion()->parse($source) ?? []);
        $printer = new Standard();
        $found = [];

        foreach (new NodeFinder()->findInstanceOf($statements, New_::class) as $node) {
            if (! $node->class instanceof Name) {
                continue;
            }

            $arguments = [];

            foreach ($node->args as $argument) {
                if ($argument instanceof Arg) {
                    $arguments[] = $printer->prettyPrintExpr($argument->value);
                }
            }

            $found[] = ['line' => $node->class->getStartLine(), 'class' => ltrim($node->class->toString(), '\\'), 'written' => self::written($node->class), 'arguments' => $arguments];
        }

        foreach (new NodeFinder()->findInstanceOf($statements, FuncCall::class) as $node) {
            $function = $node->name instanceof Name ? mb_strtolower(ltrim($node->name->toString(), '\\')) : '';
            $exception = $node->args[1] ?? null;

            if (! in_array($function, ['throw_if', 'throw_unless'], true) || ! $exception instanceof Arg || ! $exception->value instanceof ClassConstFetch) {
                continue;
            }

            $class = $exception->value->class;

            if (! $class instanceof Name || ! $exception->value->name instanceof Identifier || $exception->value->name->toLowerString() !== 'class') {
                continue;
            }

            $arguments = [];

            foreach (array_slice($node->args, 2) as $argument) {
                if ($argument instanceof Arg) {
                    $arguments[] = $printer->prettyPrintExpr($argument->value);
                }
            }

            $found[] = ['line' => $class->getStartLine(), 'class' => ltrim($class->toString(), '\\'), 'written' => self::written($class), 'arguments' => $arguments];
        }

        usort($found, static fn (array $a, array $b): int => $a['line'] <=> $b['line']);

        return $found;
    }

    private static function calleeLine(Node $expression): int
    {
        if ($expression instanceof FuncCall && $expression->name instanceof Name) {
            return $expression->name->getStartLine();
        }

        if (($expression instanceof MethodCall || $expression instanceof NullsafeMethodCall || $expression instanceof StaticCall) && $expression->name instanceof Identifier) {
            return $expression->name->getStartLine();
        }

        return $expression->getStartLine();
    }

    private static function written(Name $name): string
    {
        $original = $name->getAttribute('originalName');
        $original = $original instanceof Name ? $original : $name;

        return ($original->isFullyQualified() ? '\\' : '') . $original->toString();
    }

    private static function receiver(Node $expression): ?string
    {
        if ($expression instanceof Variable) {
            return is_string($expression->name) ? '$' . $expression->name : null;
        }

        if (($expression instanceof PropertyFetch || $expression instanceof NullsafePropertyFetch) && $expression->name instanceof Identifier) {
            return ($expression instanceof PropertyFetch ? '->' : '?->') . $expression->name->toString();
        }

        if ($expression instanceof FuncCall && $expression->name instanceof Name && $expression->args === []) {
            return mb_strtolower($expression->name->getLast()) . '()';
        }

        // `app('config')`: the container called with one string, the form that names what it resolves.
        if ($expression instanceof FuncCall && $expression->name instanceof Name && mb_strtolower($expression->name->getLast()) === 'app'
            && count($expression->args) === 1 && $expression->args[0] instanceof Arg && $expression->args[0]->value instanceof String_) {
            return "app('" . $expression->args[0]->value->value . "')";
        }

        // `$this->app['config']`: the container used as an array.
        if ($expression instanceof ArrayDimFetch && $expression->dim instanceof String_ && $expression->var instanceof PropertyFetch) {
            return self::receiver($expression->var) . "['" . $expression->dim->value . "']";
        }

        if (($expression instanceof MethodCall || $expression instanceof NullsafeMethodCall) && $expression->name instanceof Identifier && $expression->args === []) {
            return '->' . mb_strtolower($expression->name->toString()) . '()';
        }

        if ($expression instanceof StaticCall && $expression->name instanceof Identifier && $expression->args === []) {
            return '::' . mb_strtolower($expression->name->toString()) . '()';
        }

        return null;
    }
}
