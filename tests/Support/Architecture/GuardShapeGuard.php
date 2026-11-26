<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\InterpolatedStringPart;
use PhpParser\Node\Scalar\String_;
use PhpParser\NodeFinder;

/**
 * The guard over the guard folder (04-guards.md C1, catalog "Guard shape"): every guard class is named by a thin test with
 * failing examples, passing examples and one case over the real tree, and no file of the guard folder holds a path of the
 * repository as a literal.
 */
final readonly class GuardShapeGuard
{
    private const string PATH_FIX = 'a detector finds files by reflection or a directory scan, takes the root and every folder as constructor arguments, and reads a table of folders from the guide that holds it: pass the path in from the thin test';

    /**
     * @param string $guardFolder the folder of the detectors, relative to the root
     * @param list<string> $testFolders the folders of the guard tests, relative to the root
     */
    public function __construct(
        private DeclarationInspector $inspector,
        private string $root,
        private string $guardFolder,
        private array $testFolders,
    ) {
    }

    /**
     * @return list<string> one line per finding: the file, the rule and its subject
     */
    public function findings(): array
    {
        $guards = [];
        $findings = [];

        foreach ($this->inspector->phpFiles($this->root . '/' . $this->guardFolder) as $file) {
            $findings = [...$findings, ...$this->detectorFindings($file)];

            foreach (array_keys($this->inspector->declaredTypes($file)) as $type) {
                if (str_ends_with($type, 'Guard')) {
                    $guards[$type] = $this->relative($file);
                }
            }
        }

        $tests = $this->guardTests(array_keys($guards));

        foreach ($guards as $type => $path) {
            if (! array_any($tests, static fn (array $named): bool => in_array($type, $named, true))) {
                $findings[] = $path . ' untested ' . class_basename($type);
            }
        }

        foreach (array_keys($tests) as $test) {
            $parts = PhpUnitExampleReader::parts($this->inspector->statements($this->root . '/' . $test));

            foreach (['failing' => 'no-failing', 'passing' => 'no-passing', 'realTree' => 'no-real-tree'] as $part => $rule) {
                if (! $parts[$part]) {
                    $findings[] = $test . ' ' . $rule;
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
        return array_map(static fn (string $finding): string => match (explode(' ', $finding)[1] ?? '') {
            'literal-path' => $finding . ': the literal names a path of the repository: ' . self::PATH_FIX,
            'helper-name' => $finding . ': the name ends in Helpers or Scenario, which names the helpers of one test: a detector is a <Subject>Guard class',
            'untested' => $finding . ': no guard test names the guard. A guard has a thin test with failing examples that carry the words of the message, passing examples with the near misses, and one case over the real tree',
            'no-failing' => $finding . ': the guard test has no failing examples: a test that asserts the words of the message (assertStringContainsString) or a non-empty result',
            'no-passing' => $finding . ': the guard test has no passing examples: a test over a sandbox that asserts an empty result, with the near misses',
            default => $finding . ': the guard test has no real-tree case: a test without a data provider that runs the guard over dirname(__DIR__, n) and asserts an empty result',
        }, $findings);
    }

    /**
     * @return list<string>
     */
    private function detectorFindings(string $file): array
    {
        $findings = [];
        $path = $this->relative($file);

        foreach (array_keys($this->inspector->declaredTypes($file)) as $type) {
            if (str_ends_with($type, 'Helpers') || str_ends_with($type, 'Scenario')) {
                $findings[] = $path . ' helper-name ' . class_basename($type);
            }
        }

        $finder = new NodeFinder();
        $statements = $this->inspector->statements($file);
        $literals = [
            ...array_map(static fn (String_ $string): string => $string->value, $finder->findInstanceOf($statements, String_::class)),
            ...array_map(static fn (InterpolatedStringPart $part): string => $part->value, $finder->findInstanceOf($statements, InterpolatedStringPart::class)),
        ];

        foreach (array_unique($literals) as $literal) {
            if ($this->namesPath($literal)) {
                $findings[] = $path . ' literal-path ' . $literal;
            }
        }

        return $findings;
    }

    /**
     * @param list<string> $guards
     * @return array<string, list<string>> the guard classes each test file names, for the files that name any
     */
    private function guardTests(array $guards): array
    {
        $tests = [];

        foreach ($this->testFolders as $folder) {
            foreach ($this->inspector->phpFiles($this->root . '/' . $folder) as $file) {
                $named = array_values(array_intersect($this->inspector->referencedNames($file), $guards));

                if ($named !== []) {
                    $tests[$this->relative($file)] = $named;
                }
            }
        }

        return $tests;
    }

    private function namesPath(string $literal): bool
    {
        $trimmed = trim($literal, '/');

        if ($trimmed === '' || in_array($trimmed, ['.', '..'], true) || preg_match('/[\s*?{}()\[\]^$|\\\\<>]/', $trimmed) === 1) {
            return false;
        }

        $exists = is_file($this->root . '/' . $trimmed) || is_dir($this->root . '/' . $trimmed);

        return $exists && (str_contains($literal, '/') || pathinfo($trimmed, PATHINFO_EXTENSION) !== '');
    }

    private function relative(string $file): string
    {
        return substr($file, strlen($this->root) + 1);
    }
}
