<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Override;
use PhpParser\Node;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Function_;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\ParentConnectingVisitor;
use PhpParser\NodeVisitorAbstract;

final class MemberNodes
{
    /**
     * @template T of Node
     *
     * @param list<Node\Stmt> $statements statements with resolved names
     * @param class-string<T> $type
     * @return list<array{member: string, node: T}> every node of the type with its `Class::method`, `Class`, `function()` or `-` (the file body)
     */
    public static function of(array $statements, string $type): array
    {
        $visitor = new class($type) extends NodeVisitorAbstract
        {
            /** @var list<array{member: string, node: Node}> */
            public array $found = [];

            /** @var list<string> */
            private array $members = [];

            public function __construct(private readonly string $type)
            {
            }

            #[Override]
            public function enterNode(Node $node): null
            {
                if ($node instanceof ClassLike) {
                    $this->members[] = $node->name?->toString() ?? 'class@anonymous';
                }

                if ($node instanceof ClassMethod) {
                    $this->members[] = ($this->members === [] ? '' : end($this->members) . '::') . $node->name->toString();
                }

                if ($node instanceof Function_) {
                    $this->members[] = $node->name->toString() . '()';
                }

                if ($node instanceof $this->type) {
                    $this->found[] = ['member' => $this->members === [] ? '-' : end($this->members), 'node' => $node];
                }

                return null;
            }

            #[Override]
            public function leaveNode(Node $node): null
            {
                if ($node instanceof ClassLike || $node instanceof ClassMethod || $node instanceof Function_) {
                    array_pop($this->members);
                }

                return null;
            }
        };

        new NodeTraverser(new ParentConnectingVisitor(), $visitor)->traverse($statements);

        $found = [];

        foreach ($visitor->found as $item) {
            if ($item['node'] instanceof $type) {
                $found[] = ['member' => $item['member'], 'node' => $item['node']];
            }
        }

        return $found;
    }
}
