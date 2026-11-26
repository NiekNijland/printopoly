<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Name;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\Trait_;
use PhpParser\Node\Stmt\TraitUse;
use PhpParser\NodeFinder;

final readonly class SingleUseTraitGuard
{
    /**
     * @param list<string> $folders the folders to scan, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private array $folders,
    ) {
    }

    /**
     * @param list<string> $sources
     * @return array<string, int> every declared trait with the number of distinct classes, enums or traits that use it
     */
    public function traitUsers(array $sources): array
    {
        $declared = [];
        $users = [];

        foreach ($sources as $index => $source) {
            foreach (new NodeFinder()->findInstanceOf(PhpSource::parse($source), ClassLike::class) as $class) {
                if ($class instanceof Trait_ && $class->namespacedName instanceof Name) {
                    $declared[] = $class->namespacedName->toString();
                }

                $user = $class->namespacedName?->toString() ?? $index . '@' . $class->getStartLine();

                foreach ($class->stmts as $statement) {
                    foreach ($statement instanceof TraitUse ? $statement->traits : [] as $trait) {
                        $users[$trait->toString()][$user] = true;
                    }
                }
            }
        }

        $counts = [];

        foreach ($declared as $trait) {
            $counts[$trait] = count($users[$trait] ?? []);
        }

        ksort($counts, SORT_STRING);

        return $counts;
    }

    /**
     * @param list<string> $sources
     * @return list<string> `Trait: message` per trait with exactly one user
     */
    public function inSources(array $sources): array
    {
        $single = array_keys(array_filter($this->traitUsers($sources), static fn (int $users): bool => $users === 1));

        return array_map(static fn (string $trait): string => $trait . ': a trait used by exactly one class. Move its members into that class, or into a parent or a collaborator; a trait is for code that several classes share.', $single);
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $sources = [];

        foreach ($this->folders as $folder) {
            foreach ($this->inspector->phpFiles($this->root . '/' . $folder) as $file) {
                $sources[] = (string) file_get_contents($file);
            }
        }

        return $this->inSources($sources);
    }
}
