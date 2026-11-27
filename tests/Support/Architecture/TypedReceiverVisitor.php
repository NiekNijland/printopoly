<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Override;
use PhpParser\Node;
use PhpParser\Node\Expr;
use PhpParser\Node\Expr\ArrowFunction;
use PhpParser\Node\Expr\Assign;
use PhpParser\Node\Expr\Closure;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\FunctionLike;
use PhpParser\Node\Identifier;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Property;
use PhpParser\NodeVisitorAbstract;

/**
 * @internal for TypedReceivers
 */
final class TypedReceiverVisitor extends NodeVisitorAbstract
{
    /** @var list<list<string>> property names that hold the type, one entry per class on the way down */
    private array $properties = [];

    /** @var list<list<string>> variable names that hold the type, one entry per function on the way down */
    private array $variables = [[]];

    /**
     * @param list<string> $types
     */
    public function __construct(private readonly TypedReceivers $reader, private readonly array $types)
    {
    }

    #[Override]
    public function enterNode(Node $node): null
    {
        if ($node instanceof ClassLike) {
            $this->properties[] = $this->propertiesOf($node);
        }

        if ($node instanceof FunctionLike) {
            $this->variables[] = $this->variablesOf($node);
        }

        if ($node instanceof Assign && $node->var instanceof Variable && is_string($node->var->name)) {
            $this->assign($node->var->name, $node->expr);
        }

        if (($node instanceof Variable || $node instanceof PropertyFetch) && $this->holds($node)) {
            $this->reader->mark($node);
        }

        return null;
    }

    #[Override]
    public function leaveNode(Node $node): null
    {
        if ($node instanceof ClassLike) {
            array_pop($this->properties);
        }

        if ($node instanceof FunctionLike) {
            array_pop($this->variables);
        }

        return null;
    }

    private function holds(Expr $receiver): bool
    {
        return match (true) {
            $receiver instanceof Variable => is_string($receiver->name) && in_array($receiver->name, $this->last($this->variables), true),
            $receiver instanceof PropertyFetch => $receiver->var instanceof Variable && $receiver->var->name === 'this'
                && $receiver->name instanceof Identifier && $this->properties !== []
                && in_array($receiver->name->toString(), $this->last($this->properties), true),
            default => $this->reader->holds($receiver),
        };
    }

    private function assign(string $name, Expr $value): void
    {
        $held = ($value instanceof Variable || $value instanceof PropertyFetch || $value instanceof FuncCall) && $this->holds($value);
        $current = array_values(array_diff(array_pop($this->variables) ?? [], [$name]));

        if ($held) {
            $current[] = $name;
        }

        $this->variables[] = $current;
    }

    /**
     * @param list<list<string>> $scopes
     * @return list<string>
     */
    private function last(array $scopes): array
    {
        $last = array_key_last($scopes);

        return $last === null ? [] : $scopes[$last];
    }

    /**
     * @return list<string>
     */
    private function propertiesOf(ClassLike $class): array
    {
        $names = [];

        foreach ($class->stmts as $statement) {
            if ($statement instanceof Property && TypedReceivers::typeHolds($statement->type, $this->types)) {
                foreach ($statement->props as $item) {
                    $names[] = $item->name->toString();
                }
            }

            if ($statement instanceof ClassMethod && $statement->name->toLowerString() === '__construct') {
                foreach ($statement->params as $parameter) {
                    if ($parameter->flags !== 0 && TypedReceivers::typeHolds($parameter->type, $this->types) && $parameter->var instanceof Variable && is_string($parameter->var->name)) {
                        $names[] = $parameter->var->name;
                    }
                }
            }
        }

        return $names;
    }

    /**
     * @return list<string> the typed parameters, and what a closure takes in with `use` or an arrow function takes from outside
     */
    private function variablesOf(FunctionLike $function): array
    {
        $outer = $this->last($this->variables);
        $names = $function instanceof ArrowFunction ? $outer : [];

        if ($function instanceof Closure) {
            foreach ($function->uses as $use) {
                if (is_string($use->var->name) && in_array($use->var->name, $outer, true)) {
                    $names[] = $use->var->name;
                }
            }
        }

        foreach ($function->getParams() as $parameter) {
            if (TypedReceivers::typeHolds($parameter->type, $this->types) && $parameter->var instanceof Variable && is_string($parameter->var->name)) {
                $names[] = $parameter->var->name;
            }
        }

        return $names;
    }
}
