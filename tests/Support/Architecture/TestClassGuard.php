<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class TestClassGuard
{
    /** @var array<string, string> */
    private const array RULES = [
        'extra-class' => 'a test file that declares more than its test class: put a test double in the test support folder, or make it an anonymous class',
        'outside-support' => 'a class of the test folder outside a test file, the support folder, the concerns folder and the base test case: move it to the support folder',
    ];

    /**
     * @param string $tests the test folder, relative to the root
     * @param list<string> $supportFolders the folders (relative to the root) that hold the test support classes and traits
     * @param string $baseSetUp the file of the base test case, relative to the root
     */
    public function __construct(
        private DeclarationInspector $inspector,
        private string $root,
        private string $tests,
        private array $supportFolders,
        private string $baseSetUp,
    ) {
    }

    /**
     * @return list<string> `<path> <rule> <type>` per type in the wrong file, sorted
     */
    public function violations(): array
    {
        $found = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->tests) as $file) {
            $relative = mb_substr($file, mb_strlen($this->root) + 1);
            $isTest = str_ends_with($file, 'Test.php');
            $isSupport = $relative === $this->baseSetUp || array_any($this->supportFolders, static fn (string $folder): bool => str_starts_with($relative, rtrim($folder, '/') . '/'));

            foreach ($this->inspector->declarations($file) as $declaration) {
                $name = $declaration->name?->toString() ?? '';

                if ($isTest && $name !== basename($file, '.php')) {
                    $found[] = $relative . ' extra-class ' . $name;
                }

                if (! $isTest && ! $isSupport) {
                    $found[] = $relative . ' outside-support ' . $name;
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
}
