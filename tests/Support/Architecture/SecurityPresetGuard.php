<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Expr\Eval_;
use PhpParser\Node\Expr\ShellExec;

final readonly class SecurityPresetGuard
{
    public const string MESSAGE = 'the security preset bans weak hashes, guessable random values, temporary names, shell calls, eval, unserialize, extract and assert: name the algorithm with hash(), take random values from Str or random_int(), use the filesystem and process helpers, store JSON';

    private const array FUNCTIONS = ['md5', 'sha1', 'uniqid', 'rand', 'mt_rand', 'tempnam', 'str_shuffle', 'shuffle', 'array_rand', 'exec', 'shell_exec', 'system', 'passthru', 'create_function', 'unserialize', 'extract', 'mb_parse_str', 'dl', 'assert'];

    private const array CONSTRUCTS = [Eval_::class => 'eval', ShellExec::class => 'backticks'];

    /**
     * @param list<string> $folders the folders of the user namespaces, relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private array $folders,
    ) {
    }

    /**
     * @return list<string> `<path>::<member> security <name>` per use, sorted
     */
    public function violations(): array
    {
        return PresetScan::findings($this->inspector, $this->root, $this->folders, 'security', self::FUNCTIONS, [], self::CONSTRUCTS);
    }

    public static function explain(string $finding): string
    {
        return $finding . ': ' . self::MESSAGE;
    }
}
