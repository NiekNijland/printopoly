<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Expr;

final readonly class BannedTestCallGuard
{
    /**
     * @param string $tests the test folder, relative to the root
     * @param list<string> $withoutTestClock folders (relative to the root) whose tests have no test clock: the pure unit tier
     * @param string $baseSetUp the file of the base set-up (relative to the root), the one place the stray flags are switched on
     * @param list<string> $projectNamespaces the namespaces of the project's own classes
     */
    public function __construct(
        private DeclarationInspector $inspector,
        private string $root,
        private string $tests,
        private array $withoutTestClock,
        private string $baseSetUp,
        private array $projectNamespaces,
    ) {
    }

    /**
     * @return list<string> `<path>::<member> <rule>` per banned call, sorted
     */
    public function violations(): array
    {
        $found = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            $relative = mb_substr($file, mb_strlen($this->root) + 1);
            $hasTestClock = ! array_any($this->withoutTestClock, static fn (string $folder): bool => str_starts_with($relative, rtrim($folder, '/') . '/'));

            foreach (MemberNodes::of($this->inspector->statements($file), Expr::class) as $site) {
                $rule = TestStateRules::rule($site['node'], $hasTestClock)
                    ?? TestIsolationRules::rule($site['node'], $relative === $this->baseSetUp)
                    ?? TestPathRules::rule($site['node'], $this->projectNamespaces);

                if ($rule !== null) {
                    $found[] = $relative . '::' . $site['member'] . ' ' . $rule;
                }
            }
        }

        sort($found, SORT_STRING);

        return $found;
    }

    public static function explain(string $finding): string
    {
        $rule = mb_substr($finding, (int) mb_strrpos($finding, ' ') + 1);
        $rules = [...TestStateRules::RULES, ...TestIsolationRules::RULES, ...TestPathRules::RULES];

        return $finding . ': ' . ($rules[$rule] ?? $rule);
    }
}
