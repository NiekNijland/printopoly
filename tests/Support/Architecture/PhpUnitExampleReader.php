<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr;
use PhpParser\Node\Expr\Array_;
use PhpParser\Node\Expr\CallLike;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\Int_;
use PhpParser\Node\Scalar\MagicConst\Dir;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\NodeFinder;

/**
 * Reads the three parts of a PHPUnit guard test (04-guards.md C1, "The guards themselves"). A test is a public method named
 * test... or carrying the attribute Test. Its body counts with the private helpers of its class that it calls. The real-tree
 * case is a test without a data provider that builds a root from dirname(__DIR__, n), calls a method named violations or
 * findings and asserts an empty result; a failing example asserts a non-empty result or the words of a message; a passing
 * example asserts an empty result and is not the real-tree case.
 */
final class PhpUnitExampleReader
{
    private const array FAILING_ASSERTS = ['assertstringcontainsstring', 'assertstringstartswith', 'assertstringendswith', 'assertmatchesregularexpression', 'assertarrayhaskey', 'assertcontains', 'assertfalse', 'assertnotempty', 'assertnotsame', 'expectexception', 'expectexceptionmessage'];

    private const array PASSING_ASSERTS = ['assertempty', 'asserttrue', 'assertnull'];

    private const array EXACT_ASSERTS = ['assertsame', 'assertequals'];

    private const array PROVIDERS = ['dataprovider', 'dataproviderexternal', 'testwith', 'testwithjson'];

    /**
     * @param list<Stmt> $statements the statements of one test file
     * @return array{failing: bool, passing: bool, realTree: bool}
     */
    public static function parts(array $statements): array
    {
        $finder = new NodeFinder();
        $methods = [];

        foreach ($finder->findInstanceOf($statements, ClassMethod::class) as $method) {
            $methods[$method->name->toLowerString()] = $method;
        }

        $parts = ['failing' => false, 'passing' => false, 'realTree' => false];

        foreach ($methods as $name => $method) {
            if (! $method->isPublic() || (! str_starts_with($name, 'test') && ! self::hasAttribute($method, ['test']))) {
                continue;
            }

            $body = self::body($finder, $method, $methods, []);
            $asserts = self::asserts($finder, $body);
            $isReal = ! self::hasAttribute($method, self::PROVIDERS) && self::readsOwnTree($finder, $body) && $asserts['passing'];

            $parts['failing'] = $parts['failing'] || (! $isReal && $asserts['failing']);
            $parts['passing'] = $parts['passing'] || (! $isReal && $asserts['passing']);
            $parts['realTree'] = $parts['realTree'] || $isReal;
        }

        return $parts;
    }

    /**
     * @param array<string, ClassMethod> $methods
     * @param list<string> $seen
     * @return list<Node>
     */
    private static function body(NodeFinder $finder, ClassMethod $method, array $methods, array $seen): array
    {
        $nodes = $method->stmts ?? [];
        $seen[] = $method->name->toLowerString();

        foreach ([...$finder->findInstanceOf($nodes, MethodCall::class), ...$finder->findInstanceOf($nodes, StaticCall::class)] as $call) {
            $own = $call instanceof MethodCall
                ? $call->var instanceof Variable && $call->var->name === 'this'
                : $call->class instanceof Name && in_array($call->class->toLowerString(), ['self', 'static'], true);
            $name = $call->name instanceof Identifier ? $call->name->toLowerString() : '';

            if ($own && isset($methods[$name]) && ! in_array($name, $seen, true)) {
                $nodes = [...$nodes, ...self::body($finder, $methods[$name], $methods, $seen)];
                $seen[] = $name;
            }
        }

        return array_values($nodes);
    }

    /**
     * @param list<string> $names lower-case short names of attributes
     */
    private static function hasAttribute(ClassMethod $method, array $names): bool
    {
        foreach ($method->attrGroups as $group) {
            foreach ($group->attrs as $attribute) {
                $short = mb_strtolower($attribute->name->getLast());

                if (in_array($short, $names, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param list<Node> $body
     * @return array{failing: bool, passing: bool}
     */
    private static function asserts(NodeFinder $finder, array $body): array
    {
        $failing = false;
        $passing = false;

        foreach ([...$finder->findInstanceOf($body, MethodCall::class), ...$finder->findInstanceOf($body, StaticCall::class)] as $call) {
            $name = $call->name instanceof Identifier ? $call->name->toLowerString() : '';
            $first = self::firstArgument($call);
            $exact = in_array($name, self::EXACT_ASSERTS, true);
            $countOfZero = $name === 'assertcount' && $first instanceof Int_ && $first->value === 0;

            $failing = $failing || in_array($name, self::FAILING_ASSERTS, true) || ($name === 'assertcount' && ! $countOfZero) || ($exact && ! self::isEmpty($first));
            $passing = $passing || in_array($name, self::PASSING_ASSERTS, true) || $countOfZero || ($exact && self::isEmpty($first));
        }

        return ['failing' => $failing, 'passing' => $passing];
    }

    private static function firstArgument(CallLike $call): ?Expr
    {
        return $call->isFirstClassCallable() ? null : ($call->getArgs()[0] ?? null)?->value;
    }

    private static function isEmpty(?Expr $expression): bool
    {
        return $expression instanceof Array_ && $expression->items === [];
    }

    /**
     * @param list<Node> $body
     */
    private static function readsOwnTree(NodeFinder $finder, array $body): bool
    {
        $dirname = array_any(
            $finder->findInstanceOf($body, FuncCall::class),
            static fn (FuncCall $call): bool => $call->name instanceof Name && $call->name->toLowerString() === 'dirname' && self::firstArgument($call) instanceof Dir,
        );

        $calls = [...$finder->findInstanceOf($body, MethodCall::class), ...$finder->findInstanceOf($body, NullsafeMethodCall::class), ...$finder->findInstanceOf($body, StaticCall::class)];

        return $dirname && array_any(
            $calls,
            static fn (MethodCall|NullsafeMethodCall|StaticCall $call): bool => $call->name instanceof Identifier && preg_match('/violations|findings/i', $call->name->toString()) === 1,
        );
    }
}
