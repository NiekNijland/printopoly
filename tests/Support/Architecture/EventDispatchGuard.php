<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Illuminate\Contracts\Events\Dispatcher as DispatcherContract;
use Illuminate\Events\Dispatcher;
use Illuminate\Foundation\Events\Dispatchable;
use PhpParser\Node;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Identifier;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\TraitUse;
use PhpParser\NodeFinder;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\ParserFactory;

/**
 * An event goes out as `Event::dispatch(new XEvent(...))`: the refactoring tool rewrites `XEvent::dispatch()` into the
 * helper `event()`, which the analyser forbids, so no event uses the trait `Dispatchable`, and no dispatcher the class
 * receives (typed parameter or property, `app('events')`) dispatches by hand.
 */
final readonly class EventDispatchGuard
{
    private const array DISPATCHERS = [DispatcherContract::class, Dispatcher::class];

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
        $statements = new NodeTraverser(new NameResolver())->traverse(new ParserFactory()->createForHostVersion()->parse($source) ?? []);
        $dispatchers = TypedReceivers::in($statements, self::DISPATCHERS, ['events']);
        $finder = new NodeFinder();
        $violations = [];

        foreach ($finder->findInstanceOf($statements, ClassLike::class) as $class) {
            foreach ($finder->findInstanceOf($class->stmts, TraitUse::class) as $use) {
                foreach ($use->traits as $trait) {
                    if (ltrim($trait->toString(), '\\') === Dispatchable::class) {
                        $name = $class->name?->toString() ?? 'class@anonymous';
                        $violations[] = $use->getStartLine() . ': ' . $name . ' uses ' . Dispatchable::class . ': dispatch the event with Event::dispatch(new '
                            . $name . '(...)) and drop the trait (the refactoring tool rewrites ' . $name . '::dispatch() into event(), which the analyser forbids)';
                    }
                }
            }
        }

        foreach ($finder->find($statements, static fn (Node $node): bool => $node instanceof MethodCall) as $call) {
            if ($call instanceof MethodCall && $call->name instanceof Identifier && $call->name->toLowerString() === 'dispatch' && $dispatchers->holds($call->var)) {
                $violations[] = $call->getStartLine() . ': the dispatcher dispatches an event by hand: write Event::dispatch(...) with the same argument';
            }
        }

        return $violations;
    }
}
