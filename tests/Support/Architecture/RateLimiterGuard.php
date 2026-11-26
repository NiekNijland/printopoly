<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Illuminate\Cache\RateLimiter as CacheRateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use PhpParser\Node;
use PhpParser\Node\Expr\ClassConstFetch;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\New_;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\Float_;
use PhpParser\Node\Scalar\Int_;
use PhpParser\Node\Scalar\String_;
use PhpParser\Node\Stmt\Class_;
use PhpParser\NodeFinder;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\ParserFactory;

/**
 * Every limiter is registered in the one provider with `RateLimiter::for()` (the facade, an injected limiter), its numbers come from config, and a
 * route takes it by name (`throttle:<name>`), never by numbers (`throttle:60,1`). That every route carries a throttle is the route-list coverage
 * test's (tests/Feature/Http/RouteRateLimitCoverageTest.php).
 */
final readonly class RateLimiterGuard
{
    private const string NUMBER_IN_CONFIG = 'the number of a limit lives in config (%s) and is read with Config::integer(): Limit::perMinute(Config::integer(\'...\'))->by($key), and the window is the factory (perMinute, perHour, perDay)';

    /**
     * @param list<string> $sources the folders that register limiters and declare routes, relative to the root
     * @param string $provider the class name of the one provider that registers every limiter
     * @param string $limitsConfig the config file that holds the numbers, as the message names it
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private array $sources,
        private string $provider,
        private string $limitsConfig,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $violations = [];

        foreach ($this->sources as $source) {
            foreach ($this->inspector->phpFiles($this->root . '/' . $source) as $file) {
                foreach ($this->inSource((string) file_get_contents($file)) as $violation) {
                    $violations[] = substr($file, strlen($this->root) + 1) . ':' . $violation;
                }
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
        $finder = new NodeFinder();
        $violations = [];

        foreach ($finder->find($statements, static fn (Node $node): bool => $node instanceof StaticCall || $node instanceof New_) as $call) {
            if (! $call instanceof StaticCall && ! $call instanceof New_ || ! $call->class instanceof Name || ltrim($call->class->toString(), '\\') !== Limit::class) {
                continue;
            }

            $number = $finder->findFirst($call->args, static fn (Node $node): bool => $node instanceof Int_ || $node instanceof Float_
                || ($node instanceof ClassConstFetch && $node->name instanceof Identifier && $node->name->toLowerString() !== 'class'));

            if ($number instanceof Node) {
                $violations[] = $call->getStartLine() . ': a limit with a number or a constant in the code: ' . sprintf(self::NUMBER_IN_CONFIG, $this->limitsConfig);
            }
        }

        $limiters = TypedReceivers::in($statements, [RateLimiter::class, CacheRateLimiter::class]);

        foreach ($finder->find($statements, static fn (Node $node): bool => $node instanceof StaticCall || $node instanceof MethodCall) as $call) {
            if (! $call instanceof StaticCall && ! $call instanceof MethodCall || ! $call->name instanceof Identifier || $call->name->toLowerString() !== 'for') {
                continue;
            }

            // The facade, an injected limiter and `app(RateLimiter::class)` are the same call.
            $onLimiter = $call instanceof StaticCall
                ? $call->class instanceof Name && ltrim($call->class->toString(), '\\') === RateLimiter::class
                : $limiters->holds($call->var);

            if (! $onLimiter) {
                continue;
            }

            $provider = $finder->findFirst($statements, fn (Node $node): bool => $node instanceof Class_
                && $node->namespacedName?->toString() === $this->provider
                && $node->getStartLine() <= $call->getStartLine() && $call->getEndLine() <= $node->getEndLine());

            if (! $provider instanceof Class_) {
                $violations[] = $call->getStartLine() . ': a limiter defined outside ' . $this->provider . ': every RateLimiter::for() lives in that provider, and a route takes it with throttle:<name>';
            }
        }

        foreach ($finder->findInstanceOf($statements, String_::class) as $text) {
            if (preg_match('/^throttle:\d/', $text->value) === 1) {
                $violations[] = $text->getStartLine() . ': a throttle with numbers in the route ("' . $text->value . '"): ' . sprintf(self::NUMBER_IN_CONFIG, $this->limitsConfig) . '; the route takes the limiter with throttle:<name>';
            }
        }

        sort($violations, SORT_NATURAL);

        return $violations;
    }
}
