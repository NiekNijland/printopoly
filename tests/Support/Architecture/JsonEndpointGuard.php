<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Name;
use PhpParser\Node\Stmt\Class_;
use PhpParser\NodeFinder;
use PhpParser\ParserFactory;

/**
 * A JSON endpoint returns a Data object (spatie/laravel-data) or a collection of them, and a write wraps it with its status:
 * never `response()->json()` (helper or facade, `json` and `jsonp`), never `new JsonResponse([...])` with an array built in
 * place, never an API Resource class. Blind spot, named in the guide: a `new JsonResponse($value)` whose value is a variable
 * holding an array (the guard reads no types), and an action that returns a bare array.
 */
final readonly class JsonEndpointGuard
{
    private const string MESSAGE = 'a JSON answer that is not a Data object: return a Data object (or a collection of them) and let the framework write the response; a write wraps it with its status';

    private const array RESOURCE_PARENTS = ['JsonResource', 'ResourceCollection', 'AnonymousResourceCollection'];

    /**
     * @param string $folder the application folder, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $folder,
    ) {
    }

    /**
     * @return list<string> `path: line N: message`, relative to the root
     */
    public function violations(): array
    {
        return FolderScan::over($this->inspector, $this->root, [$this->folder], fn (string $path, string $source): array => $this->inSource($source));
    }

    /**
     * @return list<string> `line N: message`
     */
    public function inSource(string $source): array
    {
        $lines = [];

        foreach ($this->inspector->calls($source) as $call) {
            $byHelper = in_array($call['kind'], ['method', 'nullsafe'], true) && $call['receiver'] === 'response()';
            $byFacade = $call['kind'] === 'static' && basename(str_replace('\\', '/', $call['class'] ?? '')) === 'Response';

            if (($byHelper || $byFacade) && in_array($call['name'], ['json', 'jsonp'], true)) {
                $lines[] = $call['line'];
            }
        }

        foreach (PhpCallReader::instantiations($source) as $instantiation) {
            if (basename(str_replace('\\', '/', $instantiation['class'])) === 'JsonResponse' && str_starts_with($instantiation['arguments'][0] ?? '', '[')) {
                $lines[] = $instantiation['line'];
            }
        }

        $statements = new ParserFactory()->createForHostVersion()->parse($source) ?? [];

        foreach (new NodeFinder()->findInstanceOf($statements, Class_::class) as $class) {
            if ($class->extends instanceof Name && in_array($class->extends->getLast(), self::RESOURCE_PARENTS, true)) {
                $lines[] = $class->getStartLine();
            }
        }

        sort($lines);

        return array_map(static fn (int $line): string => 'line ' . $line . ': ' . self::MESSAGE, $lines);
    }
}
