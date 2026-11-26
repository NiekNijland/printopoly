<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\EmptyCatchGuard;
use Tests\Support\Architecture\LogMessageGuard;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class ErrorHandlingArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Print;\nuse Illuminate\\Support\\Facades\\Log;\nuse Throwable;\nfinal class Renderer\n{\n    public function run(\\Psr\\Log\\LoggerInterface \$logger): void\n    {\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function swallowedCatches(): iterable
    {
        yield 'an empty catch of Throwable' => [self::HEAD . "        try { \$this->a(); } catch (Throwable) {}\n    }\n}\n"];
        yield 'an empty catch of Exception by its full name' => [self::HEAD . "        try { \$this->a(); } catch (\\Exception \$e) {}\n    }\n}\n"];
        yield 'a broad catch that only returns' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { return; }\n    }\n}\n"];
        yield 'a broad catch in a union' => [self::HEAD . "        try { \$this->a(); } catch (\\JsonException|\\RuntimeException \$e) { \$x = 1; }\n    }\n}\n"];
        yield 'a broad catch under an alias' => ["<?php\nnamespace App;\nuse Throwable as Any;\nfinal class A { public function b(): void { try { \$this->c(); } catch (Any) { \$d = 1; } } }\n"];
    }

    #[DataProvider('swallowedCatches')]
    public function test_it_detects_a_broad_catch_that_swallows_the_exception(string $source): void
    {
        $violations = new EmptyCatchGuard(new CallInspector(), dirname(__DIR__, 2), ['app'])->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('a broad catch that only swallows the exception: report it with report(), rethrow it, or catch the exact exception', $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function handledCatches(): iterable
    {
        yield 'a broad catch that reports' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { report(\$e); }\n    }\n}\n"];
        yield 'a broad catch that rethrows' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { throw new \\App\\Print\\PrintFailed(previous: \$e); }\n    }\n}\n"];
        yield 'a broad catch that rescues' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { rescue(fn () => 1); }\n    }\n}\n"];
        yield 'a job that fails itself' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { \$this->fail(\$e); }\n    }\n}\n"];
        yield 'a named exception left empty' => [self::HEAD . "        try { \$this->a(); } catch (\\App\\Print\\PrintFailed) {}\n    }\n}\n"];
        yield 'an Exception class of the application' => ["<?php\nnamespace App\\Print;\nfinal class A { public function b(): void { try { \$this->c(); } catch (Exception) {} } }\n"];
    }

    #[DataProvider('handledCatches')]
    public function test_it_accepts_a_broad_catch_that_reports_rescues_or_rethrows_and_a_named_exception(string $source): void
    {
        self::assertSame([], new EmptyCatchGuard(new CallInspector(), dirname(__DIR__, 2), ['app'])->inSource($source));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function messagesBuiltFromTheError(): iterable
    {
        yield 'the facade with the message' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { Log::warning(\$e->getMessage()); throw \$e; }\n    }\n}\n", 'the log message is built from getMessage()'];
        yield 'the message joined into the line' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { Log::error('failed: ' . \$e->getMessage()); throw \$e; }\n    }\n}\n", 'the log message is built from getMessage()'];
        yield 'the message in the context' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { Log::error('failed', ['error' => \$e->getMessage()]); throw \$e; }\n    }\n}\n", 'the log context carries getMessage()'];
        yield 'an injected logger' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { \$logger->info(\$e->getMessage()); throw \$e; }\n    }\n}\n", 'the log message is built from getMessage()'];
        yield 'the helper' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { logger(\$e->getMessage()); throw \$e; }\n    }\n}\n", 'the log message is built from getMessage()'];
        yield 'a channel' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { Log::channel('a')->error(\$e->getMessage()); throw \$e; }\n    }\n}\n", 'the log message is built from getMessage()'];
        yield 'a message held in a variable' => [self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { \$m = \$e->getMessage(); Log::error(\$m); throw \$e; }\n    }\n}\n", 'the log message is built from getMessage()'];
    }

    #[DataProvider('messagesBuiltFromTheError')]
    public function test_it_detects_a_log_line_built_from_the_message_of_an_error(string $source, string $reason): void
    {
        $violations = new LogMessageGuard(new CallInspector(), dirname(__DIR__, 2), 'app')->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
    }

        public function test_it_accepts_a_fixed_line_with_the_error_as_context_and_a_message_read_for_another_use(): void
        {
        $source = self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { Log::warning('render failed', ['exception' => \$e]); \$this->status(\$e->getMessage()); throw \$e; }\n    }\n}\n";

        self::assertSame([], new LogMessageGuard(new CallInspector(), dirname(__DIR__, 2), 'app')->inSource($source));
    }

        public function test_it_reads_a_tree_under_a_dot_directory(): void
        {
        $root = SourceSandbox::create(['app/Print/Renderer.php' => self::HEAD . "        try { \$this->a(); } catch (Throwable \$e) { Log::info(\$e->getMessage()); }\n    }\n}\n"], '.checkout-');

        try {
            $catches = new EmptyCatchGuard(new CallInspector(), $root, ['app'])->violations();
            $logs = new LogMessageGuard(new CallInspector(), $root, 'app')->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $catches);
        self::assertStringStartsWith('app/Print/Renderer.php:9: a broad catch', $catches[0]);
        self::assertCount(1, $logs);
        self::assertStringStartsWith('app/Print/Renderer.php:9: the log message', $logs[0]);
    }

        public function test_it_holds_the_real_tree_to_its_counted_list_and_finds_no_log_line_built_from_an_error(): void
        {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/swallowed-catches.txt')->differences(new EmptyCatchGuard(new CallInspector(), $root, ['app'])->violations()));
        self::assertSame([], new LogMessageGuard(new CallInspector(), $root, 'app')->violations());
    }
}
