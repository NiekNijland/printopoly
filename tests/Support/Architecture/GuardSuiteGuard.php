<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use SimpleXMLElement;
use Tests\Support\RecursiveFiles;

/**
 * Point 4 of the CI contract (04-guards.md C4): every guard test file is in the guard group, and the group's command is a line of
 * the checks script.
 *
 * Decision (this project, PHPUnit): the guard group is the test suite `Guards` of phpunit.xml, not a `#[Group]`. A guard test file
 * is a test file that names a class of the guard folder (04-guards.md C1); it sits in a directory of that suite and in no
 * directory of another suite, so the default run (`composer test:unit`, every suite) runs it once and the checks step runs it with
 * `--testsuite Guards`. A test file in the suite that names no guard class is no guard and belongs in another suite.
 */
final readonly class GuardSuiteGuard
{
    /**
     * @param string $testsFolder the test folder relative to the root (`tests`)
     * @param string $guardNamespace the namespace of the guard folder (`Tests\Support\Architecture`)
     */
    public function __construct(
        private string $root,
        private string $phpunitConfig,
        private string $checksScript,
        private string $testsFolder,
        private string $suite,
        private string $guardNamespace,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        foreach ([$this->phpunitConfig, $this->checksScript] as $file) {
            if (! is_file($file)) {
                return ['the file ' . $file . ' does not exist: the guard suite and its command are read from it'];
            }
        }

        if (! is_dir($this->root . '/' . $this->testsFolder)) {
            return ['the test folder ' . $this->root . '/' . $this->testsFolder . ' does not exist'];
        }

        $tests = [];

        foreach (RecursiveFiles::in($this->root . '/' . $this->testsFolder) as $file) {
            if (str_ends_with($file->getFilename(), 'Test.php')) {
                $tests[mb_substr($file->getPathname(), mb_strlen($this->root) + 1)] = (string) file_get_contents($file->getPathname());
            }
        }

        return $this->inTree((string) file_get_contents($this->phpunitConfig), (string) file_get_contents($this->checksScript), $tests);
    }

    /**
     * @param array<string, string> $testFiles the test files by their path relative to the root
     * @return list<string>
     */
    public function inTree(string $phpunitXml, string $checksText, array $testFiles): array
    {
        $suites = $this->suites($phpunitXml);
        $violations = [];

        if (! isset($suites[$this->suite])) {
            return ['phpunit.xml has no <testsuite name="' . $this->suite . '">: add it with the directory of the guard tests'];
        }

        if (preg_match('/^[^#\n]*--testsuite ' . preg_quote($this->suite, '/') . '\b/m', $checksText) !== 1) {
            $violations[] = 'no line of the checks script runs `--testsuite ' . $this->suite . '`: the guard tests run in the checks step. Add the task "Guard tests::php -d memory_limit=-1 vendor/bin/phpunit --testsuite ' . $this->suite . ' --fail-on-empty-test-suite"';
        }

        foreach ($testFiles as $path => $source) {
            $isGuard = str_contains($source, $this->guardNamespace . '\\');
            $inGuards = $this->covers($suites[$this->suite], $path);
            $others = array_keys(array_filter($suites, fn (array $paths, string $name): bool => $name !== $this->suite && $this->covers($paths, $path), ARRAY_FILTER_USE_BOTH));

            if ($isGuard && ! $inGuards) {
                $violations[] = $path . ' names a guard class and is in no directory of the ' . $this->suite . ' suite: the checks step does not run it. Move it to a directory of that suite';
            }

            if ($isGuard && $others !== []) {
                $violations[] = $path . ' is a guard test that the suite ' . implode(', ', $others) . ' runs as well: the default run runs it twice. Keep it in the ' . $this->suite . ' suite only';
            }

            if (! $isGuard && $inGuards) {
                $violations[] = $path . ' is in the ' . $this->suite . ' suite and names no class of ' . $this->guardNamespace . ': a guard test is a detector class plus its thin test. Move it to another suite';
            }
        }

        return $violations;
    }

    /**
     * @return array<string, list<string>> the directories and files of every suite, relative to the root, without a trailing slash
     */
    private function suites(string $phpunitXml): array
    {
        $suites = [];
        $xml = new SimpleXMLElement($phpunitXml);

        foreach ($this->nodes($xml, '//testsuite') as $suite) {
            $paths = [];

            foreach ([...$this->nodes($suite, 'directory'), ...$this->nodes($suite, 'file')] as $path) {
                $paths[] = rtrim(trim((string) $path), '/');
            }

            $suites[(string) $suite['name']] = $paths;
        }

        return $suites;
    }

    /**
     * @param list<string> $paths
     */
    private function covers(array $paths, string $file): bool
    {
        return array_any($paths, static fn (string $path): bool => $file === $path || str_starts_with($file, $path . '/'));
    }

    /**
     * @return list<SimpleXMLElement>
     */
    private function nodes(SimpleXMLElement $element, string $path): array
    {
        $nodes = $element->xpath($path);

        return is_array($nodes) ? array_values($nodes) : [];
    }
}
