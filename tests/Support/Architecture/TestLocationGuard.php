<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class TestLocationGuard
{
    /** @var array<string, string> */
    private const array RULES = [
        'belongs-in' => 'the test of a class sits in the folder that mirrors the class: move it there',
        'no-folder' => 'a test sits in a folder the app does not have: put it in the folder of the code it covers',
    ];

    /**
     * @param string $app the source folder the tests mirror, relative to the root
     * @param string $tests the test folder, relative to the root
     * @param list<string> $tiers the folders of the test folder whose tests mirror the source folder
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $app,
        private string $tests,
        private array $tiers,
    ) {
    }

    /**
     * @return list<string> `<test> belongs-in <folder>` or `<test> no-folder <folder>` per test away from the code it covers, sorted
     */
    public function violations(): array
    {
        $appRoot = $this->root . '/' . $this->app . '/';
        $classes = [];
        $folders = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->app) as $file) {
            $relative = mb_substr($file, mb_strlen($appRoot));
            $folder = dirname($relative) === '.' ? '' : dirname($relative);
            $classes[basename($relative, '.php')][$folder] = true;

            for ($ancestor = $folder; $ancestor !== '' && $ancestor !== '.'; $ancestor = dirname($ancestor)) {
                $folders[$ancestor] = true;
            }
        }

        $found = [];

        foreach ($this->tiers as $tier) {
            $tierRoot = $this->root . '/' . $this->tests . '/' . $tier . '/';

            foreach ($this->inspector->phpFiles($tierRoot, mayBeAbsent: true) as $file) {
                if (! str_ends_with($file, 'Test.php')) {
                    continue;
                }

                $relative = mb_substr($file, mb_strlen($tierRoot));
                $folder = dirname($relative) === '.' ? '' : dirname($relative);
                $name = basename($relative, 'Test.php');
                $path = $this->tests . '/' . $tier . '/' . $relative;

                if (isset($classes[$name])) {
                    if (! isset($classes[$name][$folder])) {
                        $homes = array_map(fn (int|string $home): string => rtrim($this->tests . '/' . $tier . '/' . $home, '/'), array_keys($classes[$name]));
                        $found[] = $path . ' belongs-in ' . implode(' or ', $homes);
                    }

                    continue;
                }

                if ($folder !== '' && ! isset($folders[$folder])) {
                    $found[] = $path . ' no-folder ' . $this->app . '/' . $folder;
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
