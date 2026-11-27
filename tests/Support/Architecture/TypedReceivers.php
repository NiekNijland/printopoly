<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr;
use PhpParser\Node\Expr\ClassConstFetch;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\IntersectionType;
use PhpParser\Node\Name;
use PhpParser\Node\NullableType;
use PhpParser\Node\Scalar\String_;
use PhpParser\Node\UnionType;
use PhpParser\NodeTraverser;
use WeakMap;

/**
 * The receivers of a method call that hold an object of a type by declaration: a parameter or a property typed with one
 * of the names (the type must be resolved by the name resolver first; a nullable, union or intersection type counts when
 * one member is a name), a plain variable assigned from such a receiver (`$d = $this->db`), and the container string form
 * `app('db')`. It is how a guard reads "an injected dispatcher / logger / connection" without a booted application.
 *
 * A name is read in its own scope: a typed parameter holds in its function (and in a closure that `use`s it or an arrow
 * function inside it), a typed property holds in its class, so an untyped `$d` of another class of the same file is not
 * read. Blind spots (the guide sentence of a rule names them): a receiver that is untyped, a property declared in a parent
 * class, a getter such as `$this->getConnection()`, and an alias made by anything but a plain assignment.
 */
final readonly class TypedReceivers
{
    /**
     * @param WeakMap<Node, true> $held the variable and property nodes that hold an object of a listed type
     * @param list<string> $containerKeys
     * @param list<string> $types
     */
    private function __construct(
        private array $types,
        private WeakMap $held,
        private array $containerKeys,
    ) {
    }

    /**
     * @param array<array-key, Node> $statements resolved statements
     * @param list<string> $types fully qualified type names, without a leading backslash
     * @param list<string> $containerKeys the strings that `app()` resolves to such an object (`'events'`, `'log'`, `'db'`)
     */
    public static function in(array $statements, array $types, array $containerKeys = []): self
    {
        $reader = new self($types, new WeakMap(), $containerKeys);

        new NodeTraverser(new TypedReceiverVisitor($reader, $types))->traverse($statements);

        return $reader;
    }

    /**
     * @internal for TypedReceiverVisitor
     */
    public function mark(Node $node): void
    {
        $this->held[$node] = true;
    }

    public function holds(Expr $receiver): bool
    {
        return match (true) {
            $receiver instanceof Variable, $receiver instanceof PropertyFetch => isset($this->held[$receiver]),
            $receiver instanceof FuncCall => $receiver->name instanceof Name && $receiver->name->toLowerString() === 'app' && $this->resolvesFromContainer(($receiver->getArgs()[0] ?? null)?->value),
            default => false,
        };
    }

    /**
     * @param list<string> $types
     *
     * @internal for the visitor of this class
     */
    public static function typeHolds(?Node $type, array $types): bool
    {
        return match (true) {
            $type instanceof Name => in_array(ltrim($type->toString(), '\\'), $types, true),
            $type instanceof NullableType => self::typeHolds($type->type, $types),
            $type instanceof UnionType, $type instanceof IntersectionType => array_any($type->types, static fn (Node $member): bool => self::typeHolds($member, $types)),
            default => false,
        };
    }

    /**
     * `app('events')` (a key the caller lists) and `app(Dispatcher::class)` (a type the caller lists).
     */
    private function resolvesFromContainer(?Expr $argument): bool
    {
        return match (true) {
            $argument instanceof String_ => in_array($argument->value, $this->containerKeys, true),
            $argument instanceof ClassConstFetch => $argument->class instanceof Name && $argument->name instanceof Identifier
                && $argument->name->toLowerString() === 'class' && in_array(ltrim($argument->class->toString(), '\\'), $this->types, true),
            default => false,
        };
    }
}
