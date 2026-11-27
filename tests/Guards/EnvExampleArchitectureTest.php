<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\EnvExampleGuard;
use Tests\Support\SourceSandbox;

final class EnvExampleArchitectureTest extends TestCase
{
    private const string OWN = "<?php\n\nreturn [\n    'contact' => env('PRINTOPOLY_CONTACT_EMAIL', 'hallo@printopoly.nl'),\n    'disk' => env('PRINTOPOLY_DISK', 'local'),\n];\n";

    private const string STOCK = "<?php\n\nreturn ['url' => env('REDIS_URL'), 'host' => env('REDIS_HOST', '127.0.0.1')];\n";

    /**
     * @return iterable<string, array{array<string, string>, string, string}>
     */
    public static function settingsThatAreNotListed(): iterable
    {
        $example = "APP_NAME=Printopoly\nPRINTOPOLY_DISK=local\nREDIS_HOST=redis\n";

        yield 'a setting of an own config' => [['config/printopoly.php' => self::OWN], $example, 'config/printopoly.php reads PRINTOPOLY_CONTACT_EMAIL, which .env.example does not list'];
        yield 'a setting the project added to a shipped config' => [['config/database.php' => "<?php\n\nreturn ['queue' => ['host' => env('REDIS_QUEUE_HOST', env('REDIS_HOST'))], 'url' => env('REDIS_URL')];\n"], $example, 'config/database.php reads REDIS_QUEUE_HOST'];
        yield 'a setting named in a comment only' => [['config/printopoly.php' => self::OWN], $example . "# Set PRINTOPOLY_CONTACT_EMAIL in production.\n", 'reads PRINTOPOLY_CONTACT_EMAIL'];
        yield 'a setting that only another setting holds' => [['config/printopoly.php' => self::OWN], $example . "MAIL_FROM=\${PRINTOPOLY_CONTACT_EMAIL}\n", 'reads PRINTOPOLY_CONTACT_EMAIL'];
        yield 'a setting read with a fully qualified call' => [['config/printopoly.php' => "<?php\n\nreturn ['a' => \\env('PRINTOPOLY_RELEASE')];\n"], $example, 'reads PRINTOPOLY_RELEASE'];
    }

    /**
     * @param array<string, string> $configs
     */
    #[DataProvider('settingsThatAreNotListed')]
    public function test_it_detects_a_setting_a_config_reads_that_the_example_does_not_list(array $configs, string $example, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->guard('')->inProject($configs, ['config/database.php' => [self::STOCK]], $example)));
    }

    public function test_it_accepts_listed_and_commented_settings_and_the_settings_a_package_ships(): void
    {
        $configs = ['config/printopoly.php' => self::OWN, 'config/database.php' => self::STOCK, 'config/app.php' => "<?php\n\nreturn ['first' => \$keys(...), 'key' => \$env['X'] ?? env(\$name)];\n"];
        $example = "PRINTOPOLY_DISK=local\n# PRINTOPOLY_CONTACT_EMAIL=hallo@printopoly.nl\n";

        self::assertSame([], $this->guard('')->inProject($configs, ['config/database.php' => [self::STOCK]], $example));
    }

    public function test_it_reads_the_shipped_configs_of_a_tree_under_a_dot_directory_and_says_when_the_example_is_missing(): void
    {
        $root = SourceSandbox::create([
            'config/printopoly.php' => self::OWN,
            'config/database.php' => self::STOCK,
            'vendor/laravel/framework/config/database.php' => self::STOCK,
            '.env.example' => "PRINTOPOLY_DISK=local\n",
        ], '.checkout-');

        try {
            self::assertSame(['config/printopoly.php reads PRINTOPOLY_CONTACT_EMAIL, which .env.example does not list: a new setup misses the setting. Add `PRINTOPOLY_CONTACT_EMAIL=` with its value for development'], $this->guard($root)->violations());
            self::assertSame(['the file .env.dist does not exist: it lists every setting the configs read'], new EnvExampleGuard($root, 'config', '.env.dist', 'vendor/*/*/config')->violations());
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_it_keeps_every_setting_of_the_projects_own_configs_in_the_example(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    private function guard(string $root): EnvExampleGuard
    {
        return new EnvExampleGuard($root, 'config', '.env.example', 'vendor/*/*/config');
    }
}
