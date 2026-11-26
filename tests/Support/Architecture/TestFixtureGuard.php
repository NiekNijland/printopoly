<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr\Assign;
use PhpParser\Node\Expr\AssignOp;
use PhpParser\Node\Expr\AssignRef;
use PhpParser\Node\Expr\PropertyFetch;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\NodeFinder;
use PHPUnit\Framework\Attributes\Before;

final readonly class TestFixtureGuard
{
    public const string MESSAGE = 'test data kept in a property that the set-up fills for every test: build the state in the test, in local variables, or through a scenario helper of the test support folder';

    private const string BEFORE_ATTRIBUTE = Before::class;

    /**
     * @param string $tests the test folder, relative to the root
     */
    public function __construct(
        private DeclarationInspector $inspector,
        private string $root,
        private string $tests,
    ) {
    }

    /**
     * @return list<string> `<path>::<Class>::<hook> fixture <property>` per property a set-up hook assigns, sorted
     */
    public function violations(): array
    {
        $found = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            $relative = mb_substr($file, mb_strlen($this->root) + 1);

            foreach ($this->inspector->declarations($file) as $declaration) {
                foreach ($declaration->getMethods() as $method) {
                    if (! $this->isSetUpHook($method)) {
                        continue;
                    }

                    foreach ($this->assignedProperties($method) as $property) {
                        $found[] = $relative . '::' . $declaration->name?->toString() . '::' . $method->name->toString() . ' fixture ' . $property;
                    }
                }
            }
        }

        sort($found, SORT_STRING);

        return $found;
    }

    public static function explain(string $finding): string
    {
        return $finding . ': ' . self::MESSAGE;
    }

    private function isSetUpHook(ClassMethod $method): bool
    {
        if (str_starts_with($method->name->toLowerString(), 'setup')) {
            return true;
        }

        foreach ($method->attrGroups as $group) {
            foreach ($group->attrs as $attribute) {
                if (ltrim($attribute->name->toString(), '\\') === self::BEFORE_ATTRIBUTE) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private function assignedProperties(ClassMethod $method): array
    {
        $properties = [];

        foreach (new NodeFinder()->find($method->stmts ?? [], static fn (Node $node): bool => $node instanceof Assign || $node instanceof AssignOp || $node instanceof AssignRef) as $assign) {
            $target = $assign instanceof Assign || $assign instanceof AssignOp || $assign instanceof AssignRef ? $assign->var : null;

            if ($target instanceof PropertyFetch && $target->var instanceof Variable && $target->var->name === 'this' && $target->name instanceof Identifier) {
                $properties[] = $target->name->toString();
            }
        }

        return $properties;
    }
}
