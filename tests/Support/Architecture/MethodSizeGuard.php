<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Error;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\NodeFinder;

final readonly class MethodSizeGuard
{
    /**
     * @param string $source the folder of the application code, relative to the root
     * @param string $guide the guide that holds the sentence with the two limits, relative to the root
     * @param string $controllerFolder the folder name that marks a controller; a public method of a class in it is an action
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $source,
        private string $guide,
        private string $controllerFolder,
    ) {
    }

    /**
     * @return array{int, int}|null the limit of a method and of a controller action, as the guide states them
     */
    public function limits(): ?array
    {
        $found = preg_match('/Een methode telt hoogstens (\d+) regels, een controller-actie hoogstens (\d+)\./', GuideText::of($this->root, $this->guide), $match) === 1;

        return $found ? [(int) $match[1], (int) $match[2]] : null;
    }

    /**
     * @return list<string> one `path::Class::method::lines` per method over its limit, sorted
     */
    public function findings(): array
    {
        $limits = $this->limits();

        if ($limits === null) {
            return ['guide ' . $this->guide];
        }

        $findings = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->source) as $file) {
            $path = mb_substr($file, mb_strlen($this->root) + 1);

            try {
                $statements = $this->inspector->statements($file);
            } catch (Error $error) {
                $findings[] = 'unreadable ' . $path . ': ' . $error->getMessage();

                continue;
            }

            foreach (new NodeFinder()->findInstanceOf($statements, ClassLike::class) as $class) {
                foreach ($class->getMethods() as $method) {
                    $lines = $method->getEndLine() - $method->name->getStartLine() + 1;

                    if ($lines > $this->limitOf($path, $method, $limits)) {
                        $findings[] = $path . '::' . ($class->name?->toString() ?? 'class@anonymous') . '::' . $method->name->toString() . '::' . $lines;
                    }
                }
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
        $limits = $this->limits() ?? [0, 0];

        return array_map(function (string $finding) use ($limits): string {
            $parts = explode('::', $finding);

            if (str_starts_with($finding, 'guide ')) {
                return $this->guide . ' no longer holds the sentence the guard reads (Een methode telt hoogstens N regels, een controller-actie hoogstens N.): restore it, the guard takes its numbers from it.';
            }

            if (count($parts) !== 4) {
                return $finding;
            }

            return $parts[0] . ': ' . $parts[1] . '::' . $parts[2] . ' has ' . $parts[3] . ' lines, over the limit of ' . $limits[0] . ' for a method and ' . $limits[1] . ' for a controller action: split it by responsibility, never by line count, as ' . $this->guide . ' says.';
        }, $findings);
    }

    /**
     * @param array{int, int} $limits
     */
    private function limitOf(string $path, ClassMethod $method, array $limits): int
    {
        $action = in_array($this->controllerFolder, explode('/', dirname($path)), true) && $method->isPublic() && $method->name->toString() !== '__construct';

        return $action ? $limits[1] : $limits[0];
    }
}
