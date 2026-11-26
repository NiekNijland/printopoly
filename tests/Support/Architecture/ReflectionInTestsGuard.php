<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr;
use PhpParser\Node\Expr\Assign;
use PhpParser\Node\Expr\ClassConstFetch;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\New_;
use PhpParser\Node\Expr\NullsafeMethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\FunctionLike;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\NodeFinder;

final readonly class ReflectionInTestsGuard
{
    public const string MESSAGE = 'a test reaches a private member through reflection: test through the public behavior, or give the class a public seam; read only the public structure of a class';

    private const array MEMBER_REFLECTION = ['ReflectionMethod', 'ReflectionProperty', 'ReflectionClassConstant', 'ReflectionObject'];

    private const array PUBLIC_STRUCTURE = [
        'getAttributes', 'implementsInterface', 'isSubclassOf', 'getName', 'getShortName', 'getNamespaceName', 'getInterfaceNames',
        'getParentClass', 'getTraitNames', 'isFinal', 'isAbstract', 'isInterface', 'isEnum', 'isReadOnly', 'isInstantiable', 'getFileName',
        'isAnonymous', 'hasMethod', 'getConstructor', 'newInstance', 'newInstanceArgs', 'getMethods', 'getProperties',
    ];

    /**
     * @param string $tests the test folder, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $tests,
    ) {
    }

    /**
     * @return list<string> `<path>::<member> reflection <what>` per way a test reaches into a class, sorted
     */
    public function violations(): array
    {
        $found = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            $relative = mb_substr($file, mb_strlen($this->root) + 1);

            foreach (MemberNodes::of($this->inspector->statements($file), Expr::class) as $site) {
                $what = $this->reach($site['node']);

                if ($what !== null) {
                    $found[] = $relative . '::' . $site['member'] . ' reflection ' . $what;
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

    private function reach(Expr $node): ?string
    {
        if ($node instanceof New_ && $node->class instanceof Name) {
            $class = ltrim($node->class->toString(), '\\');

            if (in_array($class, self::MEMBER_REFLECTION, true)) {
                return $class;
            }

            return $class === 'ReflectionClass' && ! $this->readsPublicStructure($node) ? 'ReflectionClass' : null;
        }

        if (($node instanceof MethodCall || $node instanceof NullsafeMethodCall) && $node->name instanceof Identifier
            && in_array($node->name->toString(), ['setAccessible', 'bindTo'], true)) {
            return $node->name->toString();
        }

        if ($node instanceof StaticCall && $node->class instanceof Name && ltrim($node->class->toString(), '\\') === 'Closure'
            && $node->name instanceof Identifier && $node->name->toString() === 'bind') {
            return 'Closure::bind';
        }

        return null;
    }

    private function readsPublicStructure(New_ $new): bool
    {
        $parent = $new->getAttribute('parent');

        if ($parent instanceof Assign && $parent->expr === $new && $parent->var instanceof Variable && is_string($parent->var->name)) {
            return $this->variableReadsPublicStructure($parent, $parent->var->name);
        }

        return $parent instanceof MethodCall && $parent->var === $new && self::isPublicStructureRead($parent);
    }

    private function variableReadsPublicStructure(Assign $assign, string $variable): bool
    {
        $scope = $assign->getAttribute('parent');

        while ($scope instanceof Node && ! $scope instanceof FunctionLike) {
            $scope = $scope->getAttribute('parent');
        }

        if (! $scope instanceof FunctionLike) {
            return false;
        }

        $calls = new NodeFinder()->find(
            $scope->getStmts() ?? [],
            static fn (Node $node): bool => $node instanceof MethodCall && $node->var instanceof Variable && $node->var->name === $variable,
        );

        return array_all($calls, static fn (Node $call): bool => $call instanceof MethodCall && self::isPublicStructureRead($call));
    }

    private static function isPublicStructureRead(MethodCall $call): bool
    {
        if (! $call->name instanceof Identifier) {
            return false;
        }

        $method = $call->name->toString();
        $filters = ['getMethods' => 'ReflectionMethod', 'getProperties' => 'ReflectionProperty'];

        if (! isset($filters[$method])) {
            return in_array($method, self::PUBLIC_STRUCTURE, true);
        }

        $filter = $call->getArgs()[0]->value ?? null;

        return $filter instanceof ClassConstFetch && $filter->class instanceof Name && ltrim($filter->class->toString(), '\\') === $filters[$method]
            && $filter->name instanceof Identifier && $filter->name->toString() === 'IS_PUBLIC';
    }
}
