<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Identifier;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\ClassMethod;
use PHPUnit\Framework\Attributes\Test;

final readonly class TestDeclarationGuard
{
    private const string TEST_ATTRIBUTE = Test::class;

    /** @var array<string, string> */
    private const array RULES = [
        'test-attribute' => 'a test declared with the Test attribute: write a public method whose name is test_ plus a sentence (test_refuses_an_expired_token)',
        'test-annotation' => 'a test declared with the test annotation: write a public method whose name is test_ plus a sentence (test_refuses_an_expired_token)',
        'test-name' => 'a test method whose name is no sentence after test_: write test_ plus the sentence in snake case, the casing of the formatter (test_refuses_an_expired_token)',
        'test-void' => 'a test method without the return type void: declare : void',
        'provider-annotation' => 'a data provider named in an annotation: write the DataProvider attribute with a static provider',
        'group-annotation' => 'a group named in an annotation: the guard tests are the Guards suite of phpunit.xml, a test needs no group',
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
     * @return list<string> `<path>::<Class>::<method> <rule>` per finding, sorted
     */
    public function violations(): array
    {
        $found = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            if (! str_ends_with($file, 'Test.php')) {
                continue;
            }

            $relative = mb_substr($file, mb_strlen($this->root) + 1);

            foreach ($this->inspector->declarations($file) as $class) {
                if (! $class instanceof Class_) {
                    continue;
                }

                if ($this->annotated($class->getDocComment()?->getText(), 'group')) {
                    $found[] = $relative . '::' . $class->name?->toString() . ' group-annotation';
                }

                foreach ($class->getMethods() as $method) {
                    foreach ($this->methodRules($method) as $rule) {
                        $found[] = $relative . '::' . $class->name?->toString() . '::' . $method->name->toString() . ' ' . $rule;
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

    /**
     * @return list<string>
     */
    private function methodRules(ClassMethod $method): array
    {
        $doc = $method->getDocComment()?->getText();
        $name = $method->name->toString();
        $attribute = $this->hasTestAttribute($method);
        $annotation = $this->annotated($doc, 'test');
        $rules = [];

        if ($attribute) {
            $rules[] = 'test-attribute';
        }

        if ($annotation) {
            $rules[] = 'test-annotation';
        }

        if ($this->annotated($doc, 'dataProvider')) {
            $rules[] = 'provider-annotation';
        }

        if ($this->annotated($doc, 'group')) {
            $rules[] = 'group-annotation';
        }

        $isTest = $method->isPublic() && ($attribute || $annotation || str_starts_with($name, 'test'));

        if (! $isTest) {
            return $rules;
        }

        if (! $attribute && ! $annotation && preg_match('/^test(_[a-z0-9]+)+$/', $name) !== 1) {
            $rules[] = 'test-name';
        }

        if (! $method->returnType instanceof Identifier || $method->returnType->toLowerString() !== 'void') {
            $rules[] = 'test-void';
        }

        return $rules;
    }

    private function hasTestAttribute(ClassMethod $method): bool
    {
        foreach ($method->attrGroups as $group) {
            foreach ($group->attrs as $attribute) {
                if (ltrim($attribute->name->toString(), '\\') === self::TEST_ATTRIBUTE) {
                    return true;
                }
            }
        }

        return false;
    }

    private function annotated(?string $doc, string $tag): bool
    {
        return $doc !== null && preg_match('/@' . $tag . '\b/', $doc) === 1;
    }
}
