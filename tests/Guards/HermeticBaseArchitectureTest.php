<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\ListedFindings;
use Tests\Support\Architecture\HermeticBaseGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class HermeticBaseArchitectureTest extends TestCase
{
    private const string BASE = 'tests/TestCase.php';

    private const array CALLS = [
        'http' => '        Http::preventStrayRequests();',
        'processes' => '        Process::preventStrayProcesses();',
        'process fake' => '        Process::fake([]);',
        'sleep' => '        Sleep::fake();',
        'clock' => '        $this->freezeTime();',
        'uuids' => '        Str::createUuidsNormally();',
        'strings' => '        Str::createRandomStringsNormally();',
    ];

    /**
     * @return iterable<string, array{array<string, string>, string}>
     */
    public static function weakenedBases(): iterable
    {
        yield 'the stray requests left open' => [['http' => ''], 'missing Http::preventStrayRequests()'];
        yield 'the stray processes left open' => [['processes' => ''], 'missing Process::preventStrayProcesses()'];
        yield 'processes prevented without a fake' => [['process fake' => ''], 'missing Process::fake([])'];
        yield 'processes faked with a handler' => [['process fake' => "        Process::fake(['*' => 'ok']);"], 'missing Process::fake([])'];
        yield 'a real sleep' => [['sleep' => ''], 'missing Sleep::fake()'];
        yield 'a moving clock' => [['clock' => ''], 'missing $this->freezeTime()'];
        yield 'a clock frozen on another object' => [['clock' => '        $other->freezeTime();'], 'missing $this->freezeTime()'];
        yield 'pinned ids from the test before' => [['uuids' => ''], 'missing Str::createUuidsNormally()'];
        yield 'pinned strings from the test before' => [['strings' => ''], 'missing Str::createRandomStringsNormally()'];
        yield 'a flag switched off' => [['http' => '        Http::preventStrayRequests(false);'], 'missing Http::preventStrayRequests()'];
        yield 'a call of the same name on another class' => [['sleep' => '        \\App\\Support\\Sleep::fake();'], 'missing Sleep::fake()'];
    }

    /**
     * @param array<string, string> $changes
     */
    #[DataProvider('weakenedBases')]
    public function test_finds_a_base_set_up_that_lacks_a_call(array $changes, string $words): void
    {
        self::assertSame([self::BASE . ' ' . $words], $this->findings([self::BASE => $this->base([...self::CALLS, ...$changes])]));
        self::assertStringContainsString('parent::setUp()', HermeticBaseGuard::explain('x missing y'));
    }

    public function test_finds_the_calls_before_the_parent_set_up_as_missing(): void
    {
        $source = $this->base([]);
        $early = str_replace("        parent::setUp();\n", implode("\n", self::CALLS) . "\n        parent::setUp();\n", $source);

        self::assertCount(7, $this->findings([self::BASE => $early]));
    }

    public function test_finds_a_test_case_that_boots_around_the_base(): void
    {
        $test = "<?php\nfinal class OwnBootTest extends \\Illuminate\\Foundation\\Testing\\TestCase {}\n";
        $aliased = "<?php\nuse Illuminate\\Foundation\\Testing\\TestCase as Framework;\nfinal class AliasTest extends Framework {}\n";

        self::assertSame([
            'tests/Feature/AliasTest.php bypasses-base AliasTest',
            'tests/Feature/OwnBootTest.php bypasses-base OwnBootTest',
        ], $this->findings([self::BASE => $this->base(self::CALLS), 'tests/Feature/OwnBootTest.php' => $test, 'tests/Feature/AliasTest.php' => $aliased]));
    }

    public function test_accepts_the_full_base_the_smoke_suite_and_tests_on_the_base(): void
    {
        $smoke = "<?php\nuse PHPUnit\\Framework\\Attributes\\Group;\n#[Group('smoke')]\nfinal class SmokeTest extends \\Illuminate\\Foundation\\Testing\\TestCase {}\n";
        $feature = "<?php\nfinal class FooTest extends \\Tests\\TestCase {}\n";
        $calls = [...self::CALLS, 'sleep' => '        Sleep::fake(syncWithCarbon: true);'];

        self::assertSame([], $this->findings([self::BASE => $this->base($calls), 'tests/Smoke/SmokeTest.php' => $smoke, 'tests/Feature/FooTest.php' => $feature]));
    }

    public function test_the_real_tree_lacks_no_call_beyond_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $found = new HermeticBaseGuard(new PhpFileInspector(), $root, 'tests', self::BASE)->violations();

        self::assertSame([], new ListedFindings($root . '/tests/Guards/lists/hermetic-base.txt')->compare($found, HermeticBaseGuard::explain(...)));
    }

    /**
     * @param array<string, string> $calls
     */
    private function base(array $calls): string
    {
        return "<?php\n\nnamespace Tests;\n\nuse Illuminate\\Support\\Facades\\Http;\nuse Illuminate\\Support\\Facades\\Process;\nuse Illuminate\\Support\\Sleep;\nuse Illuminate\\Support\\Str;\n\n"
            . "abstract class TestCase extends \\Illuminate\\Foundation\\Testing\\TestCase\n{\n    protected function setUp(): void\n    {\n        parent::setUp();\n"
            . implode("\n", array_filter($calls, static fn (string $call): bool => $call !== '')) . "\n    }\n}\n";
    }

    /**
     * @param array<string, string> $files
     * @return list<string>
     */
    private function findings(array $files): array
    {
        $root = SourceSandbox::create($files, '.checkout-');

        try {
            return new HermeticBaseGuard(new PhpFileInspector(), $root, 'tests', self::BASE)->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
