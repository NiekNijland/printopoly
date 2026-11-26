<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr\ClassConstFetch;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\Int_;

final class TestPathRules
{
    /** @var array<string, string> */
    public const array RULES = [
        'real-path' => 'a request that skips the middleware or the exception handler: send it through both, as a user with the permission the route asks for, and assert the response',
        'named-status' => 'a status code that has a named assertion: write the named one (assertOk, assertNotFound, assertConflict)',
        'project-double' => 'a mocking-library double of a class of the project: use the real class, or a hand-written fake in the test support folder bound with app()->instance()',
    ];

    private const array DOUBLE_METHODS = ['mock', 'spy', 'partialmock', 'createmock', 'createstub', 'createpartialmock', 'createconfiguredmock', 'createconfiguredstub', 'createtestproxy', 'getmockbuilder'];

    private const array MOCKERY_METHODS = ['mock', 'spy', 'namedmock', 'instancemock'];

    private const array NAMED_STATUSES = [200, 201, 202, 204, 301, 302, 304, 307, 308, 400, 401, 402, 403, 404, 405, 406, 408, 409, 410, 415, 422, 424, 429, 500, 503];

    /**
     * @param list<string> $projectNamespaces the namespaces of the project's own classes (`App\`)
     */
    public static function rule(Node $node, array $projectNamespaces): ?string
    {
        if ($node instanceof FuncCall) {
            return $node->name instanceof Name && in_array(mb_strtolower($node->name->getLast()), ['withoutexceptionhandling', 'withoutmiddleware'], true) ? 'real-path' : null;
        }

        if (! ($node instanceof MethodCall || $node instanceof NullsafeMethodCall || $node instanceof StaticCall) || ! $node->name instanceof Identifier) {
            return null;
        }

        $name = $node->name->toLowerString();

        if ($name === 'withoutexceptionhandling' && ! $node instanceof StaticCall) {
            return 'real-path';
        }

        if ($name === 'withoutmiddleware' && ! $node instanceof StaticCall && self::chainStartsAtTheTest($node->var)) {
            return 'real-path';
        }

        $first = $node->isFirstClassCallable() ? null : ($node->getArgs()[0]->value ?? null);

        if ($name === 'assertstatus' && $first instanceof Int_ && in_array($first->value, self::NAMED_STATUSES, true)) {
            return 'named-status';
        }

        return self::isDouble($node, $name) && self::namesProjectClass($first, $projectNamespaces) ? 'project-double' : null;
    }

    private static function isDouble(MethodCall|NullsafeMethodCall|StaticCall $call, string $name): bool
    {
        if ($call instanceof StaticCall) {
            $class = $call->class instanceof Name ? ltrim($call->class->toString(), '\\') : '';

            return ($class === 'Mockery' && in_array($name, self::MOCKERY_METHODS, true)) || (in_array(mb_strtolower($class), ['self', 'static'], true) && in_array($name, self::DOUBLE_METHODS, true));
        }

        return $call->var instanceof Variable && $call->var->name === 'this' && in_array($name, self::DOUBLE_METHODS, true);
    }

    /**
     * @param list<string> $projectNamespaces
     */
    private static function namesProjectClass(?Node $argument, array $projectNamespaces): bool
    {
        if (! $argument instanceof ClassConstFetch || ! $argument->class instanceof Name) {
            return false;
        }

        $class = ltrim($argument->class->toString(), '\\');

        return array_any($projectNamespaces, static fn (string $namespace): bool => str_starts_with($class, $namespace));
    }

    private static function chainStartsAtTheTest(Node $expression): bool
    {
        while ($expression instanceof MethodCall || $expression instanceof NullsafeMethodCall || $expression instanceof PropertyFetch) {
            $expression = $expression->var;
        }

        return ($expression instanceof Variable && $expression->name === 'this') || ($expression instanceof FuncCall && $expression->name instanceof Name && $expression->name->getLast() === 'test');
    }
}
