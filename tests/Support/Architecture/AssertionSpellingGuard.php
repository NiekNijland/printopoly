<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Arg;
use PhpParser\Node\Expr\ConstFetch;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Stmt\ClassMethod;
use PHPUnit\Framework\Assert;
use PHPUnit\Framework\Attributes\DoesNotPerformAssertions;

final readonly class AssertionSpellingGuard
{
    private const string NO_ASSERTIONS_ATTRIBUTE = DoesNotPerformAssertions::class;

    /** @var array<string, string> */
    private const array RULES = [
        'this-assert' => 'an assertion of PHPUnit called on $this: write self:: in front of it (an assertion the framework adds to the test case stays on $this)',
        'static-assert' => 'an assertion of PHPUnit called on static: write self:: in front of it',
        'assert-equals' => 'a loose comparison: write assertSame() with the exact value, or the exact assertion (assertTrue, assertCount, assertNull)',
        'no-op-assert' => 'an assertion that cannot fail: call the code and assert its result or the state it leaves behind',
    ];

    /** @var list<string> */
    private array $phpunitAssertions;

    /**
     * @param string $tests the test folder, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $tests,
    ) {
        $this->phpunitAssertions = array_map(mb_strtolower(...), array_values(array_filter(get_class_methods(Assert::class), static fn (string $method): bool => str_starts_with($method, 'assert'))));
    }

    /**
     * @return list<string> `<path>::<member> <rule> <assertion>` per finding, sorted
     */
    public function violations(): array
    {
        $found = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            $relative = mb_substr($file, mb_strlen($this->root) + 1);
            $statements = $this->inspector->statements($file);

            foreach ([...MemberNodes::of($statements, MethodCall::class), ...MemberNodes::of($statements, StaticCall::class)] as $site) {
                $rule = $this->rule($site['node']);

                if ($rule !== null && $site['node']->name instanceof Identifier) {
                    $found[] = $relative . '::' . $site['member'] . ' ' . $rule . ' ' . $site['node']->name->toString();
                }
            }

            foreach (MemberNodes::of($statements, ClassMethod::class) as $site) {
                if ($this->declaresNoAssertions($site['node'])) {
                    $found[] = $relative . '::' . $site['member'] . ' no-op-assert DoesNotPerformAssertions';
                }
            }
        }

        sort($found, SORT_STRING);

        return $found;
    }

    public static function explain(string $finding): string
    {
        $parts = explode(' ', $finding);

        return $finding . ': ' . (self::RULES[$parts[1] ?? ''] ?? '');
    }

    private function rule(MethodCall|StaticCall $call): ?string
    {
        if (! $call->name instanceof Identifier) {
            return null;
        }

        $name = $call->name->toLowerString();

        if (in_array($name, ['assertequals', 'assertnotequals'], true)) {
            return 'assert-equals';
        }

        if ($name === 'expectnottoperformassertions' || ($name === 'asserttrue' && $this->firstArgumentIsTrue($call))) {
            return 'no-op-assert';
        }

        if (! in_array($name, $this->phpunitAssertions, true)) {
            return null;
        }

        if ($call instanceof MethodCall && $call->var instanceof Variable && $call->var->name === 'this') {
            return 'this-assert';
        }

        if ($call instanceof StaticCall && $call->class instanceof Name && $call->class->toLowerString() === 'static') {
            return 'static-assert';
        }

        return null;
    }

    private function firstArgumentIsTrue(MethodCall|StaticCall $call): bool
    {
        $first = $call->isFirstClassCallable() ? null : ($call->getArgs()[0] ?? null);

        return $first instanceof Arg && $first->value instanceof ConstFetch && $first->value->name->toLowerString() === 'true';
    }

    private function declaresNoAssertions(ClassMethod $method): bool
    {
        foreach ($method->attrGroups as $group) {
            foreach ($group->attrs as $attribute) {
                if (ltrim($attribute->name->toString(), '\\') === self::NO_ASSERTIONS_ATTRIBUTE) {
                    return true;
                }
            }
        }

        return false;
    }
}
