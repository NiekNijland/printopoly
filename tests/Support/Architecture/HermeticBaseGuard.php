<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Illuminate\Foundation\Testing\TestCase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Sleep;
use Illuminate\Support\Str;
use PhpParser\Node\Expr\Array_;
use PhpParser\Node\Expr\ConstFetch;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Expression;
use PHPUnit\Framework\Attributes\Group;

final readonly class HermeticBaseGuard
{
    /** @var array<string, array{string, string}> the class and method of each call of the base set-up */
    private const array CALLS = [
        'Http::preventStrayRequests()' => [Http::class, 'preventstrayrequests'],
        'Process::preventStrayProcesses()' => [Process::class, 'preventstrayprocesses'],
        'Process::fake([])' => [Process::class, 'fake'],
        'Sleep::fake()' => [Sleep::class, 'fake'],
        '$this->freezeTime()' => ['$this', 'freezetime'],
        'Str::createUuidsNormally()' => [Str::class, 'createuuidsnormally'],
        'Str::createRandomStringsNormally()' => [Str::class, 'createrandomstringsnormally'],
    ];

    private const string FRAMEWORK_TEST_CASE = TestCase::class;

    private const string GROUP_ATTRIBUTE = Group::class;

    private const string SMOKE_GROUP = 'smoke';

    /** @var array<string, string> */
    private const array RULES = [
        'missing' => 'the base set-up lacks a call: setUp() of the base test case calls it after parent::setUp(), so no test reaches the network, starts a process, waits, sees the clock move or inherits a pinned id',
        'bypasses-base' => 'a test case that boots the application without the base set-up: extend the base test case',
    ];

    /**
     * @param string $tests the test folder, relative to the root
     * @param string $baseSetUp the file of the base test case, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $tests,
        private string $baseSetUp,
    ) {
    }

    /**
     * @return list<string> `<base> missing <call>` per call the base set-up lacks, `<path> bypasses-base <class>` per class around it, sorted
     */
    public function violations(): array
    {
        $found = [];
        $made = $this->callsAfterParent();

        foreach (array_keys(self::CALLS) as $call) {
            if (! in_array($call, $made, true)) {
                $found[] = $this->baseSetUp . ' missing ' . $call;
            }
        }

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            $relative = mb_substr($file, mb_strlen($this->root) + 1);

            foreach ($this->inspector->declarations($file) as $class) {
                if ($relative !== $this->baseSetUp && $class instanceof Class_ && $class->extends instanceof Name && ltrim($class->extends->toString(), '\\') === self::FRAMEWORK_TEST_CASE && ! $this->isSmoke($class)) {
                    $found[] = $relative . ' bypasses-base ' . $class->name?->toString();
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

    private function isSmoke(Class_ $class): bool
    {
        foreach ($class->attrGroups as $group) {
            foreach ($group->attrs as $attribute) {
                $first = $attribute->args[0]->value ?? null;

                if (ltrim($attribute->name->toString(), '\\') === self::GROUP_ATTRIBUTE && $first instanceof String_ && $first->value === self::SMOKE_GROUP) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return list<string> the calls of the list that setUp() of the base test case makes after parent::setUp()
     */
    private function callsAfterParent(): array
    {
        $made = [];

        foreach ($this->inspector->declarations($this->root . '/' . $this->baseSetUp) as $class) {
            $setUp = $class instanceof Class_ ? $class->getMethod('setUp') : null;

            if ($setUp instanceof ClassMethod) {
                $made = [...$made, ...$this->callsAfterParentIn($setUp)];
            }
        }

        return $made;
    }

    /**
     * @return list<string>
     */
    private function callsAfterParentIn(ClassMethod $setUp): array
    {
        $made = [];
        $afterParent = false;

        foreach ($setUp->stmts ?? [] as $statement) {
            $call = $statement instanceof Expression ? $statement->expr : null;

            if ($call instanceof StaticCall && $call->class instanceof Name && $call->class->toLowerString() === 'parent' && $call->name instanceof Identifier && $call->name->toLowerString() === 'setup') {
                $afterParent = true;

                continue;
            }

            if (! $afterParent || ! $call instanceof StaticCall && ! $call instanceof MethodCall || ! $call->name instanceof Identifier) {
                continue;
            }

            $owner = match (true) {
                $call instanceof StaticCall => $call->class instanceof Name ? ltrim($call->class->toString(), '\\') : '',
                $call->var instanceof Variable && $call->var->name === 'this' => '$this',
                default => '',
            };

            foreach (self::CALLS as $label => [$class, $method]) {
                if ($owner === $class && $call->name->toLowerString() === $method && $this->keepsItsDefault($call)) {
                    $made[] = $label;
                }
            }
        }

        return $made;
    }

    private function keepsItsDefault(StaticCall|MethodCall $call): bool
    {
        $first = $call->isFirstClassCallable() ? null : ($call->getArgs()[0]->value ?? null);

        return (! $first instanceof ConstFetch || $first->name->toLowerString() !== 'false') && (! $first instanceof Array_ || $first->items === []);
    }
}
