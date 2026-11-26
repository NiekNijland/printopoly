<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node\Expr\Exit_;
use PhpParser\Node\Expr\Print_;
use PhpParser\Node\Stmt\Echo_;
use PhpParser\Node\Stmt\Global_;
use PhpParser\Node\Stmt\Goto_;

final readonly class PhpPresetGuard
{
    public const string MESSAGE = 'the php preset bans debug output, die, echo, print, goto, global and the removed database and pattern functions: return or log the value, throw an exception, inject what a global would hold';

    private const array FUNCTIONS = ['dump', 'var_dump', 'print_r', 'var_export', 'debug_zval_dump', 'debug_backtrace', 'debug_print_backtrace', 'phpinfo', 'ray', 'ds', 'trap', 'ereg', 'eregi'];

    private const array PREFIXES = ['xdebug_', 'mysql_'];

    private const array CONSTRUCTS = [Exit_::class => 'die', Echo_::class => 'echo', Print_::class => 'print', Goto_::class => 'goto', Global_::class => 'global'];

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
     * @return list<string> `<path>::<member> php <name>` per use, sorted
     */
    public function violations(): array
    {
        return PresetScan::findings($this->inspector, $this->root, $this->folders, 'php', self::FUNCTIONS, self::PREFIXES, self::CONSTRUCTS);
    }

    public static function explain(string $finding): string
    {
        return $finding . ': ' . self::MESSAGE;
    }
}
