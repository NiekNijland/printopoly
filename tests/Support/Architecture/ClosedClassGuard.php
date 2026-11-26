<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Name;
use PhpParser\Node\Stmt\Class_;
use PhpParser\NodeFinder;

final readonly class ClosedClassGuard
{
    private const array MESSAGES = [
        'extended-concrete' => 'is concrete and another class extends it: make the parent `abstract` and move what only one child uses into that child, or fold the children into the parent',
        'stale-open' => 'carries the docblock tag `@final` and is final or abstract: delete the tag',
    ];

    /**
     * @param string $source the folder of the application code, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $source,
    ) {
    }

    /**
     * @return list<string> one "<rule> <class>" per finding, sorted
     */
    public function findings(): array
    {
        $findings = [];
        $concrete = [];
        $extended = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->source) as $file) {
            foreach (new NodeFinder()->findInstanceOf($this->inspector->statements($file), Class_::class) as $class) {
                if ($class->extends instanceof Name) {
                    $extended[$class->extends->toString()] = true;
                }

                if (! $class->namespacedName instanceof Name) {
                    continue;
                }

                $name = $class->namespacedName->toString();

                if (! $class->isAbstract()) {
                    $concrete[] = $name;
                }

                if (preg_match('/@final(?![A-Za-z0-9_])/', (string) $class->getDocComment()) === 1 && ($class->isAbstract() || $class->isFinal())) {
                    $findings[] = 'stale-open ' . $name;
                }
            }
        }

        foreach ($concrete as $name) {
            if (isset($extended[$name])) {
                $findings[] = 'extended-concrete ' . $name;
            }
        }

        $findings = array_values(array_unique($findings));
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
            [$rule, $name] = array_pad(explode(' ', $finding, 2), 2, '');

            return $name . ' ' . (self::MESSAGES[$rule] ?? $rule) . '.';
        }, $findings);
    }
}
