<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Stmt\Enum_;
use PhpParser\Node\Stmt\EnumCase;

final readonly class EnumShapeGuard
{
    private const array MESSAGES = [
        'backing' => 'an enum is backed by a string: declare it `enum X: string` and give every case a readable value, so a stored or sent case says what it is',
        'cases' => "an enum case is written in UPPER_CASE (`case PRINT_BOARD = 'print_board'`): rename the cases, the values stay",
        'not-enum' => 'the enums folder holds enums only: move the class to the folder of its kind',
    ];

    /**
     * @param string $source the folder of the application code, relative to the root
     * @param string $folder the folder name that holds the enums
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $source,
        private string $folder,
    ) {
    }

    /**
     * @return list<string> one "<rule> <path>" per rule an enum breaks, sorted
     */
    public function findings(): array
    {
        $findings = [];

        foreach (SourceClasses::in($this->inspector, $this->root, $this->source) as ['path' => $path, 'class' => $class]) {
            if (! $class instanceof Enum_) {
                if (SourceClasses::inFolder($path, $this->folder)) {
                    $findings[] = 'not-enum ' . $path;
                }

                continue;
            }

            if ($class->scalarType?->toLowerString() !== 'string') {
                $findings[] = 'backing ' . $path;
            }

            foreach ($class->stmts as $statement) {
                if ($statement instanceof EnumCase && $statement->name->toString() !== mb_strtoupper($statement->name->toString())) {
                    $findings[] = 'cases ' . $path;

                    break;
                }
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
            [$rule] = explode(' ', $finding, 2);

            return $finding . ': ' . (self::MESSAGES[$rule] ?? $rule) . '.';
        }, $findings);
    }
}
