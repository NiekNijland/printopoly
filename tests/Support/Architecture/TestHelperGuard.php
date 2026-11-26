<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\Node\Stmt\Function_;
use PhpParser\Node\Stmt\Trait_;
use PhpParser\NodeFinder;

final readonly class TestHelperGuard
{
    /** @var array<string, string> */
    private const array RULES = [
        'helper-function' => 'a function in the test folder: write the helper as a public static method of a final class in the test support folder',
        'helper-trait' => 'a helper method of a test trait: write it as a public static method of a final class in the test support folder; a test trait holds its set-up hook only',
        'helper-on-base' => 'a helper method on a shared base test case: write it as a public static method of a final class in the test support folder; the base case holds the hooks it overrides',
    ];

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
     * @return list<string> `<path>::<member> <rule>` per helper outside a final support class, sorted
     */
    public function violations(): array
    {
        $found = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            $relative = mb_substr($file, mb_strlen($this->root) + 1);

            foreach (new NodeFinder()->findInstanceOf($this->inspector->statements($file), Function_::class) as $function) {
                $found[] = $relative . '::' . $function->name->toString() . '() helper-function';
            }

            foreach ($this->inspector->declarations($file) as $declaration) {
                $name = $declaration->name?->toString() ?? '';

                foreach ($declaration->getMethods() as $method) {
                    $rule = match (true) {
                        $declaration instanceof Trait_ => $this->isTraitHook($method, $name) ? null : 'helper-trait',
                        $declaration instanceof Class_ && $declaration->isAbstract() => $this->overrides($method) ? null : 'helper-on-base',
                        default => null,
                    };

                    if ($rule !== null) {
                        $found[] = $relative . '::' . $name . '::' . $method->name->toString() . ' ' . $rule;
                    }
                }
            }
        }

        sort($found, SORT_STRING);

        return $found;
    }

    public static function explain(string $finding): string
    {
        $rule = mb_substr($finding, (int) mb_strrpos($finding, ' ') + 1);

        return $finding . ': ' . (self::RULES[$rule] ?? $rule);
    }

    private function isTraitHook(ClassMethod $method, string $trait): bool
    {
        return in_array($method->name->toLowerString(), [mb_strtolower('setUp' . $trait), mb_strtolower('tearDown' . $trait)], true);
    }

    private function overrides(ClassMethod $method): bool
    {
        foreach ($method->attrGroups as $group) {
            foreach ($group->attrs as $attribute) {
                if (ltrim($attribute->name->toString(), '\\') === 'Override') {
                    return true;
                }
            }
        }

        return false;
    }
}
