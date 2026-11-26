<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use RuntimeException;
use Tests\Support\RecursiveFiles;

/**
 * The guard over the guides (catalog "Docs", "Paths in the guides"): every path in backticks in a guide names a file or folder
 * that exists. An example path uses a placeholder (`<Name>`), a wildcard or braces, which the reader skips.
 */
final readonly class DocumentedPathGuard
{
    private const string FILE = '/\.(php|tsx?|mjs|js|json|md|sh|css|neon|ya?ml|txt|xml)$/';

    /**
     * @param list<string> $sourceRoots the top folders whose files a guide may name, relative to the root
     * @param list<string> $guides the guide files, relative to the root; every file with the nested guide name under a source root is a guide too
     * @param string $nestedGuide the file name of a guide that sits in many folders
     */
    public function __construct(
        private string $root,
        private array $sourceRoots,
        private array $guides,
        private string $nestedGuide,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        $files = $this->sourceFiles();
        $violations = [];

        foreach ($this->guideFiles($files) as $guide) {
            foreach (self::pathsIn((string) file_get_contents($this->root . '/' . $guide)) as [$line, $path]) {
                $top = explode('/', $path)[0];
                $known = in_array($top, $this->sourceRoots, true);

                if ($known && ! file_exists($this->root . '/' . rtrim($path, '/'))) {
                    $violations[] = $guide . ':' . $line . ': `' . $path . '` does not exist: name the file or folder as it is now, or write an example with a placeholder such as <Name>';
                }

                if (! $known && ! is_dir($this->root . '/' . $top) && preg_match(self::FILE, $path) === 1 && ! array_any($files, static fn (string $file): bool => str_ends_with('/' . $file, '/' . $path))) {
                    $violations[] = $guide . ':' . $line . ': no file ends in `' . $path . '`: name the file as it is now, from the repository root when that is clearer, or write an example with a placeholder such as <Name>';
                }
            }
        }

        return $violations;
    }

    /**
     * The paths one guide names, with their lines: a test asks whether the guide names anything at all without reading it.
     *
     * @param string $guide the guide file, relative to the root
     * @return list<array{int, string}>
     */
    public function pathsInGuide(string $guide): array
    {
        $file = $this->root . '/' . $guide;

        throw_unless(is_file($file), RuntimeException::class, 'the guide ' . $guide . ' does not exist under the root');

        return self::pathsIn((string) file_get_contents($file));
    }

    /**
     * A path is a span in backticks or in an HTML code element with a slash in it; a link target and a `:line` suffix count
     * as the path they name.
     *
     * @return list<array{int, string}>
     */
    public static function pathsIn(string $markdown): array
    {
        $paths = [];

        foreach (explode("\n", $markdown) as $index => $text) {
            preg_match_all('/`([A-Za-z0-9_.\/-]+)(?::\d+)?`|<code>([A-Za-z0-9_.\/-]+)(?::\d+)?<\/code>|\]\((?!https?:|#)([A-Za-z0-9_.\/-]+)(?:#[^)]*)?\)/', $text, $matches, PREG_SET_ORDER);

            foreach ($matches as $match) {
                $token = ($match[1] ?? '') . ($match[2] ?? '') . ($match[3] ?? '');

                if (str_contains(trim($token, '/'), '/') && ! str_contains($token, '...') && ! str_contains($token, '//') && ! str_starts_with($token, './') && ! str_starts_with($token, '../')) {
                    $paths[] = [$index + 1, $token];
                }
            }
        }

        return $paths;
    }

    /**
     * @param list<string> $files
     * @return list<string>
     */
    private function guideFiles(array $files): array
    {
        $guides = array_values(array_filter($this->guides, fn (string $guide): bool => is_file($this->root . '/' . $guide)));

        foreach ($files as $file) {
            if (basename($file) === $this->nestedGuide && ! in_array($file, $guides, true)) {
                $guides[] = $file;
            }
        }

        sort($guides);

        return $guides;
    }

    /**
     * @return list<string>
     */
    private function sourceFiles(): array
    {
        $files = [];

        foreach ($this->sourceRoots as $directory) {
            if (! is_dir($this->root . '/' . $directory)) {
                continue;
            }

            foreach (RecursiveFiles::in($this->root . '/' . $directory) as $file) {
                if ($file->isFile()) {
                    $files[] = mb_substr($file->getPathname(), mb_strlen($this->root) + 1);
                }
            }
        }

        return $files;
    }
}
