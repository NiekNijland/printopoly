<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr;
use PhpParser\Node\Expr\BinaryOp\Greater;
use PhpParser\Node\Expr\BinaryOp\GreaterOrEqual;
use PhpParser\Node\Expr\BinaryOp\Smaller;
use PhpParser\Node\Expr\BinaryOp\SmallerOrEqual;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Identifier;
use PhpParser\Node\Scalar\Int_;
use PhpParser\Node\Stmt;
use PhpParser\NodeFinder;

final readonly class QuotaCountGuard
{
    private const string FIX = 'a limit checked by counting the documents and inserting after: two requests count the same number and both insert. Claim a slot with QuotaSlots, whose unique index holds the limit';

    /**
     * @param string $folder the folder of the application code, relative to the root
     */
    public function __construct(private PhpFileInspector $inspector, private string $root, private string $folder)
    {
    }

    /**
     * @return list<string> one `path:line quota-count: reason` per finding, sorted
     */
    public function violations(): array
    {
        $violations = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->folder) as $file) {
            foreach ($this->findings($this->inspector->statements($file)) as $finding) {
                $violations[] = mb_substr($file, mb_strlen($this->root) + 1) . ':' . $finding;
            }
        }

        sort($violations, SORT_NATURAL);

        return $violations;
    }

    /**
     * @return list<string> one `line quota-count: reason` per finding of the source, in source order
     */
    public function inSource(string $source): array
    {
        return $this->findings(PhpSource::parse($source));
    }

    /**
     * @param list<Stmt> $statements
     * @return list<string>
     */
    private function findings(array $statements): array
    {
        $found = [];

        foreach (new NodeFinder()->find($statements, $this->comparesACount(...)) as $comparison) {
            $found[] = $comparison->getStartLine() . ' quota-count: ' . self::FIX;
        }

        return $found;
    }

    private function comparesACount(Node $node): bool
    {
        if (! $node instanceof GreaterOrEqual && ! $node instanceof Greater && ! $node instanceof Smaller && ! $node instanceof SmallerOrEqual) {
            return false;
        }

        return ($this->isCount($node->left) && ! $this->isExistence($node->right)) || ($this->isCount($node->right) && ! $this->isExistence($node->left));
    }

    private function isCount(Expr $expression): bool
    {
        return ($expression instanceof MethodCall || $expression instanceof NullsafeMethodCall)
            && $expression->name instanceof Identifier
            && $expression->name->toLowerString() === 'count'
            && $expression->args === [];
    }

    private function isExistence(Expr $expression): bool
    {
        return $expression instanceof Int_ && $expression->value <= 1;
    }
}
