<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Arg;
use PhpParser\Node\Expr;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\NodeFinder;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\ParserFactory;
use PhpParser\PrettyPrinter\Standard;

/**
 * A flash message is one translated line under one of the fixed keys: `Inertia::flash('success', __('...'))`, or the
 * same key and line on a redirect (`to_route(...)->with('success', __('...'))`, `back()->with(...)`). Never another key,
 * a literal, a value that is no translation, or a write to the session (`session()->flash()`, `->session()->flash()`).
 * Blind spot, named in the guide: a key or a line held in a variable first, and a redirect held in a variable before
 * `->with()`.
 */
final readonly class FlashMessageGuard
{
    private const array REDIRECT_HELPERS = ['redirect', 'back', 'to_route', 'to_action'];

    /**
     * @param list<string> $keys the fixed keys of a flash message, read from the guide
     */
    public function __construct(
        private CallInspector $inspector,
        private string $root,
        private string $folder,
        private array $keys,
    ) {
    }

    /**
     * @return list<string> `path: line N: message`, relative to the root
     */
    public function violations(): array
    {
        return FolderScan::over($this->inspector, $this->root, [$this->folder], fn (string $path, string $source): array => $this->inSource($source));
    }

    /**
     * @return list<string> `line N: message`
     */
    public function inSource(string $source): array
    {
        $statements = new NodeTraverser(new NameResolver())->traverse(new ParserFactory()->createForHostVersion()->parse($source) ?? []);
        $printer = new Standard();
        $messages = [];

        foreach (new NodeFinder()->find($statements, static fn (Node $node): bool => $node instanceof MethodCall || $node instanceof NullsafeMethodCall || $node instanceof StaticCall) as $call) {
            if (! ($call instanceof MethodCall || $call instanceof NullsafeMethodCall || $call instanceof StaticCall) || ! $call->name instanceof Identifier) {
                continue;
            }

            $name = $call->name->toLowerString();
            $line = $call->name->getStartLine();

            $onSession = $call instanceof StaticCall ? $call->class instanceof Name && $call->class->getLast() === 'Session' : $this->isSession($call->var);

            if ($onSession && in_array($name, ['flash', 'now', 'reflash'], true)) {
                $messages[] = 'line ' . $line . ": a flash message written to the session: flash it with Inertia::flash('" . $this->keys[0] . "', __('...')) or with ->with() on the redirect";

                continue;
            }

            $flashes = $call instanceof StaticCall
                ? $name === 'flash' && $call->class instanceof Name && $call->class->getLast() === 'Inertia'
                : $name === 'with' && $this->isRedirect($call->var);

            if (! $flashes) {
                continue;
            }

            $arguments = array_map(static fn (Arg $argument): string => $printer->prettyPrintExpr($argument->value), $call->getArgs());
            $problem = $this->problem($arguments[0] ?? '', $arguments[1] ?? null);

            if ($problem !== null) {
                $messages[] = 'line ' . $line . ': ' . $problem;
            }
        }

        return $messages;
    }

    private function problem(string $key, ?string $value): ?string
    {
        if (preg_match('/^\'(\w+)\'$/', $key, $match) !== 1 || ! in_array($match[1], $this->keys, true)) {
            return 'a flash message under ' . ($key === '' ? 'no key' : $key) . ': flash under one of the keys ' . implode(', ', $this->keys) . ', each with one translated line';
        }

        if ($value === null || preg_match('/^__\(\'[^\']+\'/', $value) !== 1) {
            return "a flash message that is not one translated line: write __('file.key') as the value";
        }

        return null;
    }

    private function isSession(Expr $receiver): bool
    {
        return ($receiver instanceof FuncCall && $receiver->name instanceof Name && mb_strtolower($receiver->name->getLast()) === 'session')
            || (($receiver instanceof MethodCall || $receiver instanceof NullsafeMethodCall) && $receiver->name instanceof Identifier && $receiver->name->toLowerString() === 'session');
    }

    private function isRedirect(Expr $chain): bool
    {
        while ($chain instanceof MethodCall || $chain instanceof NullsafeMethodCall) {
            $chain = $chain->var;
        }

        return ($chain instanceof FuncCall && $chain->name instanceof Name && in_array(mb_strtolower($chain->name->getLast()), self::REDIRECT_HELPERS, true))
            || ($chain instanceof StaticCall && $chain->class instanceof Name && $chain->class->getLast() === 'Redirect');
    }
}
