<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr\ArrowFunction;
use PhpParser\Node\Expr\Closure;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\InterpolatedStringPart;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PhpParser\NodeFinder;
use PhpParser\ParserFactory;

/**
 * A route parameter is camelCase (the name of the controller argument it binds to), and a route's action is a single-action controller, never a
 * closure: `Route::get('a', fn () => ...)`, `Route::fallback(function () { ... })`, a closure through the router or in an `uses` array. The guard
 * reads the route files only, so a parameter built at run time and whether the name equals the controller's argument stay review items.
 */
final readonly class RouteParameterGuard
{
    private const array ROUTE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'any', 'match', 'fallback', 'view', 'redirect'];

    public function __construct(
        private CallInspector $inspector,
        private string $root,
        private string $source,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $violations = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->source) as $file) {
            foreach ($this->inSource((string) file_get_contents($file)) as $violation) {
                $violations[] = mb_substr($file, mb_strlen($this->root) + 1) . ':' . $violation;
            }
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    public function inSource(string $source): array
    {
        $statements = new ParserFactory()->createForHostVersion()->parse($source) ?? [];
        $violations = [];

        foreach (new NodeFinder()->find($statements, static fn (Node $node): bool => $node instanceof String_ || $node instanceof InterpolatedStringPart) as $text) {
            if (! $text instanceof String_ && ! $text instanceof InterpolatedStringPart) {
                continue;
            }

            preg_match_all('/\{([A-Za-z_][\w-]*)(?::[^{}]*)?\??\}/', $text->value, $matches);

            foreach ($matches[1] as $parameter) {
                if (preg_match('/^[a-z][A-Za-z0-9]*$/', $parameter) !== 1) {
                    $violations[] = $text->getStartLine() . ': the route parameter {' . $parameter . '} is not camelCase: name it {' . lcfirst(str_replace(' ', '', ucwords(str_replace(['_', '-'], ' ', $parameter)))) . '}, the name of the controller argument it binds to';
                }
            }
        }

        foreach (new NodeFinder()->find($statements, static fn (Node $node): bool => $node instanceof StaticCall || $node instanceof MethodCall) as $call) {
            if (! $call instanceof StaticCall && ! $call instanceof MethodCall || ! $call->name instanceof Identifier || ! in_array($call->name->toLowerString(), self::ROUTE_METHODS, true)) {
                continue;
            }

            $onRouter = $call instanceof StaticCall ? $call->class instanceof Name && $call->class->getLast() === 'Route' : $this->isRouter($call->var);

            if ($onRouter && new NodeFinder()->findFirst($call->getArgs(), static fn (Node $node): bool => $node instanceof Closure || $node instanceof ArrowFunction) instanceof Node) {
                $violations[] = $call->getStartLine() . ': a route whose action is a closure: route to a single-action controller, <Area>\\<Noun>\\<Verb>Controller::class';
            }
        }

        return $violations;
    }

    private function isRouter(Node $receiver): bool
    {
        while ($receiver instanceof MethodCall) {
            $receiver = $receiver->var;
        }

        return ($receiver instanceof StaticCall && $receiver->class instanceof Name && $receiver->class->getLast() === 'Route')
            || ($receiver instanceof Variable && in_array($receiver->name, ['router', 'route'], true))
            || ($receiver instanceof PropertyFetch && $receiver->name instanceof Identifier && $receiver->name->toLowerString() === 'router');
    }
}
