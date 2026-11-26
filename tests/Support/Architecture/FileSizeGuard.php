<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Error;
use PhpParser\Node\Expr\Array_;
use PhpParser\Node\Stmt;
use PhpParser\Node\Stmt\Declare_;
use PhpParser\Node\Stmt\Nop;
use PhpParser\Node\Stmt\Return_;

final readonly class FileSizeGuard
{
    /**
     * @param list<string> $folders the folders to scan, relative to the root
     * @param string $guide the guide that holds the sentence with the limit, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private array $folders,
        private string $guide,
    ) {
    }

    public function limit(): ?int
    {
        return preg_match('/Een PHP-bestand telt hoogstens (\d+) regels/', GuideText::of($this->root, $this->guide), $match) === 1 ? (int) $match[1] : null;
    }

    /**
     * @return list<string> the path of every PHP file over the limit, sorted
     */
    public function findings(): array
    {
        $limit = $this->limit();

        if ($limit === null) {
            return ['guide ' . $this->guide];
        }

        $findings = [];

        foreach ($this->folders as $folder) {
            foreach ($this->inspector->phpFiles($this->root . '/' . $folder) as $file) {
                if (self::over((string) file_get_contents($file), $limit)) {
                    $findings[] = mb_substr($file, mb_strlen($this->root) + 1);
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
        return array_map(function (string $finding): string {
            if (str_starts_with($finding, 'guide ')) {
                return $this->guide . ' no longer holds the sentence the guard reads (Een PHP-bestand telt hoogstens N regels): restore it, the guard takes its limit from it.';
            }

            return $finding . ' has ' . self::lines((string) file_get_contents($this->root . '/' . $finding)) . ' lines, over the limit of ' . $this->limit() . ' in ' . $this->guide . ': split it by behavior (a test into <Class><Topic>Test.php, a class into the classes it already holds), not by size. A file that only returns a list of data is exempt.';
        }, $findings);
    }

    public static function over(string $source, int $limit): bool
    {
        return self::lines($source) > $limit && ! self::isData($source);
    }

    private static function lines(string $source): int
    {
        return mb_substr_count($source, "\n");
    }

    private static function isData(string $source): bool
    {
        try {
            $statements = PhpSource::parse($source);
        } catch (Error) {
            return false;
        }

        $statements = array_values(array_filter($statements, static fn (Stmt $statement): bool => ! $statement instanceof Declare_ && ! $statement instanceof Nop));

        return count($statements) === 1 && $statements[0] instanceof Return_ && $statements[0]->expr instanceof Array_;
    }
}
