<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\ComposerNamespaces;
use Tests\Support\Architecture\DeclarationInspector;
use Tests\Support\Architecture\PhpPresetGuard;
use Tests\Support\Architecture\SecurityPresetGuard;
use Tests\Support\SourceSandbox;

final class ArchitecturePresetArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string}>
     */
    public static function phpPreset(): iterable
    {
        yield 'a dump' => ['dump($a);', 'php dump()'];
        yield 'a dump by its full name' => ['\\var_dump($a);', 'php var_dump()'];
        yield 'a returning print_r' => ['$s = print_r($a, true);', 'php print_r()'];
        yield 'a returning var_export' => ['$s = var_export($a, true);', 'php var_export()'];
        yield 'a backtrace' => ['$t = debug_backtrace();', 'php debug_backtrace()'];
        yield 'phpinfo' => ['phpinfo();', 'php phpinfo()'];
        yield 'ray' => ['ray($a);', 'php ray()'];
        yield 'an xdebug function' => ['xdebug_break();', 'php xdebug_break()'];
        yield 'a removed database function' => ['mysql_query($q);', 'php mysql_query()'];
        yield 'a removed pattern function' => ["eregi('a', \$b);", 'php eregi()'];
        yield 'a function as a first-class callable' => ['$f = dump(...);', 'php dump()'];
        yield 'die' => ['die(1);', 'php die'];
        yield 'echo' => ["echo 'x';", 'php echo'];
        yield 'print' => ["print 'x';", 'php print'];
        yield 'goto' => ["goto end;\nend:", 'php goto'];
        yield 'global' => ['global $config;', 'php global'];
    }

    #[DataProvider('phpPreset')]
    public function test_finds_every_use_the_php_preset_bans(string $body, string $finding): void
    {
        $found = $this->findings($body, static fn (string $root): array => new PhpPresetGuard(new DeclarationInspector(), $root, ['app', 'database/factories'])->violations());

        self::assertSame(['app/Foo.php::Foo::run ' . $finding], $found);
        self::assertStringContainsString('php preset', PhpPresetGuard::explain($finding));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function securityPreset(): iterable
    {
        yield 'md5' => ['$h = md5($a);', 'security md5()'];
        yield 'sha1 by its full name' => ['$h = \\sha1($a);', 'security sha1()'];
        yield 'uniqid' => ['$id = uniqid();', 'security uniqid()'];
        yield 'rand' => ['$n = rand(1, 6);', 'security rand()'];
        yield 'mt_rand' => ['$n = mt_rand(1, 6);', 'security mt_rand()'];
        yield 'tempnam' => ["\$p = tempnam('/tmp', 'x');", 'security tempnam()'];
        yield 'str_shuffle' => ['$s = str_shuffle($a);', 'security str_shuffle()'];
        yield 'shuffle' => ['shuffle($a);', 'security shuffle()'];
        yield 'array_rand' => ['$k = array_rand($a);', 'security array_rand()'];
        yield 'exec' => ["exec('ls');", 'security exec()'];
        yield 'shell_exec' => ["shell_exec('ls');", 'security shell_exec()'];
        yield 'system' => ["system('ls');", 'security system()'];
        yield 'passthru' => ["passthru('ls');", 'security passthru()'];
        yield 'unserialize' => ['$o = unserialize($s);', 'security unserialize()'];
        yield 'extract' => ['extract($a);', 'security extract()'];
        yield 'mb_parse_str' => ['mb_parse_str($s, $a);', 'security mb_parse_str()'];
        yield 'dl' => ["dl('x.so');", 'security dl()'];
        yield 'assert' => ['assert($a);', 'security assert()'];
        yield 'eval' => ["eval('return 1;');", 'security eval'];
        yield 'backticks' => ['$o = `ls`;', 'security backticks'];
    }

    #[DataProvider('securityPreset')]
    public function test_finds_every_use_the_security_preset_bans(string $body, string $finding): void
    {
        $found = $this->findings($body, static fn (string $root): array => new SecurityPresetGuard(new DeclarationInspector(), $root, ['app', 'database/factories'])->violations());

        self::assertSame(['app/Foo.php::Foo::run ' . $finding], $found);
        self::assertStringContainsString('security preset', SecurityPresetGuard::explain($finding));
    }

    public function test_accepts_the_spellings_the_presets_leave_and_reads_only_the_user_namespaces(): void
    {
        $allowed = "\$h = hash('sha256', \$a);\n\$n = random_int(1, 6);\n\$o = \$cache->md5(\$a);\n\$s = Str::random(8);\n\$p = \\App\\Support\\Paths::tempnam();\n\$j = json_decode(\$s, true);\nexit(1);";
        $php = static fn (string $root): array => new PhpPresetGuard(new DeclarationInspector(), $root, ['app', 'database/factories'])->violations();
        $security = static fn (string $root): array => new SecurityPresetGuard(new DeclarationInspector(), $root, ['app', 'database/factories'])->violations();

        self::assertSame([], $this->findings($allowed, $php));
        self::assertSame([], $this->findings($allowed, $security));
        self::assertSame([], $this->findings('$s = md5($a);', $security, 'tests/Foo.php'));
        self::assertSame(['database/factories/Foo.php::Foo::run security md5()'], $this->findings('$s = md5($a);', $security, 'database/factories/Foo.php'));
    }

    public function test_reads_the_user_namespaces_from_the_manifest(): void
    {
        $root = SourceSandbox::create(['composer.json' => '{"autoload": {"psr-4": {"App\\\\": "app/", "Database\\\\Seeders\\\\": "database/seeders/"}}, "autoload-dev": {"psr-4": {"Tests\\\\": "tests/"}}}'], '.checkout-');

        try {
            self::assertSame(['App\\' => 'app', 'Database\\Seeders\\' => 'database/seeders'], ComposerNamespaces::autoloaded($root . '/composer.json'));
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_the_real_tree_uses_nothing_the_presets_ban(): void
    {
        $root = dirname(__DIR__, 2);
        $folders = array_values(ComposerNamespaces::autoloaded($root . '/composer.json'));
        $found = [...new PhpPresetGuard(new DeclarationInspector(), $root, $folders)->violations(), ...new SecurityPresetGuard(new DeclarationInspector(), $root, $folders)->violations()];
        sort($found, SORT_STRING);

        self::assertSame([], array_map(static fn (string $finding): string => str_contains($finding, ' php ') ? PhpPresetGuard::explain($finding) : SecurityPresetGuard::explain($finding), $found));
    }

    /**
     * @param callable(string): list<string> $guard
     * @return list<string>
     */
    private function findings(string $body, callable $guard, string $path = 'app/Foo.php'): array
    {
        $root = SourceSandbox::create([$path => "<?php\n\nfinal class Foo {\n    public function run(): void {\n" . $body . "\n    }\n}\n"], '.checkout-');

        foreach (['app', 'database/factories'] as $folder) {
            if (! is_dir($root . '/' . $folder)) {
                mkdir($root . '/' . $folder, 0777, true);
            }
        }

        try {
            return $guard($root);
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
