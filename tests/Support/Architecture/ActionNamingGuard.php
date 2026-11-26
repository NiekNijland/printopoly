<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Stmt\ClassMethod;

final readonly class ActionNamingGuard
{
    private const array MESSAGES = [
        'suffix' => 'an action carries no `Action` suffix: name it after what it does, a verb and a noun (`DeleteEdition`)',
        'words' => 'an action is named by a verb and a noun, at least two words (`DeleteEdition`)',
        'entry' => 'an action has one public method, `handle()`, besides its constructor: rename the entry to `handle` and make the other methods private',
    ];

    /**
     * @param string $source the folder of the application code, relative to the root
     * @param string $folder the folder name that holds the actions
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $source,
        private string $folder,
    ) {
    }

    /**
     * @return list<string> one "<rule> <path>" per rule an action breaks, sorted
     */
    public function findings(): array
    {
        $findings = [];

        foreach (SourceClasses::in($this->inspector, $this->root, $this->source) as ['path' => $path, 'class' => $class]) {
            if (! SourceClasses::isConcrete($class) || ! SourceClasses::inFolder($path, $this->folder)) {
                continue;
            }

            $name = SourceClasses::shortName($class);
            $public = array_values(array_map(
                static fn (ClassMethod $method): string => $method->name->toString(),
                array_filter($class->getMethods(), static fn (ClassMethod $method): bool => $method->isPublic() && $method->name->toLowerString() !== '__construct'),
            ));

            if (str_ends_with($name, 'Action')) {
                $findings[] = 'suffix ' . $path;
            }

            if (preg_match('/^[A-Z][a-z0-9]+[A-Z]/', $name) !== 1) {
                $findings[] = 'words ' . $path;
            }

            if ($public !== ['handle']) {
                $findings[] = 'entry ' . $path;
            }
        }

        sort($findings, SORT_STRING);

        return $findings;
    }

    /**
     * @param list<string> $findings
     * @return list<string>
     */
    public function explain(array $findings): array
    {
        return array_map(static function (string $finding): string {
            [$rule] = explode(' ', $finding, 2);

            return $finding . ': ' . (self::MESSAGES[$rule] ?? $rule) . '.';
        }, $findings);
    }
}
