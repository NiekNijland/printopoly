<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\QueuedClassLimitsGuard;
use Tests\Support\Architecture\QueueNameGuard;
use Tests\Support\Architecture\UniqueJobGuard;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class QueuedWorkArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Jobs;\nuse Illuminate\\Contracts\\Queue\\ShouldBeUnique;\nuse Illuminate\\Contracts\\Queue\\ShouldQueue;\nuse Illuminate\\Queue\\Attributes\\Timeout;\nuse Illuminate\\Queue\\Attributes\\Tries;\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function queueNamesAsText(): iterable
    {
        yield 'onQueue()' => [self::HEAD . "final class A implements ShouldQueue { public function __construct() { \$this->onQueue('pdf'); } }\n", 'onQueue() with a queue name as text'];
        yield 'onQueue() on a dispatch' => [self::HEAD . "final class A { public function b(): void { GeneratePrintJob::dispatch()->onQueue('pdf'); } }\n", 'onQueue() with a queue name as text'];
        yield 'a built name' => [self::HEAD . "final class A implements ShouldQueue { public function __construct(string \$a) { \$this->onQueue('pdf-' . \$a); } }\n", 'onQueue() with a queue name as text'];
        yield 'a property' => [self::HEAD . "final class A implements ShouldQueue { public \$queue = 'pdf'; }\n", '$queue with a queue name as text'];
        yield 'a promoted property' => [self::HEAD . "final class A implements ShouldQueue { public function __construct(public string \$queue = 'pdf') {} }\n", 'a promoted $queue with a queue name as text'];
        yield 'an assignment' => [self::HEAD . "final class A implements ShouldQueue { public function __construct() { \$this->queue = 'pdf'; } }\n", '->queue set to a queue name as text'];
    }

    #[DataProvider('queueNamesAsText')]
    public function test_it_detects_a_queue_named_by_text(string $source, string $reason): void
    {
        $violations = new QueueNameGuard(new CallInspector(), dirname(__DIR__, 2), 'app', 'config/horizon.php')->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
        self::assertStringContainsString('name the queue with a case of the one queue enum', $violations[0]);
    }

    public function test_it_accepts_a_queue_named_by_a_case(): void
    {
        self::assertSame([], new QueueNameGuard(new CallInspector(), dirname(__DIR__, 2), 'app', 'config/horizon.php')->inSource(self::HEAD . "final class A implements ShouldQueue { public function __construct() { \$this->onQueue(Queue::PDF); } }\n"));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function queuedClassesWithoutLimits(): iterable
    {
        yield 'no timeout' => [self::HEAD . "#[Tries(1)]\nfinal class A implements ShouldQueue {}\n", 'App\Jobs\A is queued without $timeout'];
        yield 'no tries' => [self::HEAD . "#[Timeout(60)]\nfinal class A implements ShouldQueue {}\n", 'App\Jobs\A is queued without $tries'];
        yield 'through a parent' => [self::HEAD . "abstract class Base implements ShouldQueue {}\n#[Tries(1)]\nfinal class A extends Base {}\n", 'App\Jobs\A is queued without $timeout'];
        yield 'through a sub-interface' => [self::HEAD . "interface Queued extends ShouldQueue {}\n#[Timeout(60)]\nfinal class A implements Queued {}\n", 'App\Jobs\A is queued without $tries'];
    }

    #[DataProvider('queuedClassesWithoutLimits')]
    public function test_it_detects_a_queued_class_without_its_limits(string $source, string $reason): void
    {
        $violations = new QueuedClassLimitsGuard(new CallInspector(), dirname(__DIR__, 2), 'app', 'config/horizon.php')->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
    }

    public function test_it_accepts_a_queued_class_with_its_limits_as_attributes_or_properties(): void
    {
        $guard = new QueuedClassLimitsGuard(new CallInspector(), dirname(__DIR__, 2), 'app', 'config/horizon.php');

        self::assertSame([], $guard->inSource(self::HEAD . "#[Timeout(300)]\n#[Tries(1)]\nfinal class A implements ShouldQueue {}\n"));
        self::assertSame([], $guard->inSource(self::HEAD . "final class B implements ShouldQueue { public int \$timeout = 60; public function retryUntil(): \\DateTimeInterface { return now(); } }\n"));
        self::assertSame([], $guard->inSource(self::HEAD . "final class C {}\n"));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function uniqueJobsWithoutAKey(): iterable
    {
        yield 'the contract' => [self::HEAD . "final class A implements ShouldBeUnique, ShouldQueue {}\n"];
        yield 'the contract by its full name' => [self::HEAD . "final class A implements \\Illuminate\\Contracts\\Queue\\ShouldBeUniqueUntilProcessing {}\n"];
        yield 'the contract through a parent' => [self::HEAD . "abstract class Base implements ShouldBeUnique {}\nfinal class A extends Base {}\n"];
        yield 'a key per class' => [self::HEAD . "final class A implements ShouldBeUnique { public string \$uniqueId = 'x'; }\n"];
    }

    #[DataProvider('uniqueJobsWithoutAKey')]
    public function test_it_detects_a_unique_job_without_its_own_key(string $source): void
    {
        $violations = new UniqueJobGuard(new CallInspector(), dirname(__DIR__, 2), 'app')->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('public function uniqueId(): string', $violations[0]);
    }

    public function test_it_accepts_a_unique_job_with_its_own_key(): void
    {
        self::assertSame([], new UniqueJobGuard(new CallInspector(), dirname(__DIR__, 2), 'app')->inSource(self::HEAD . "final class A implements ShouldBeUnique { public function uniqueId(): string { return 'k'; } }\n"));
    }

    public function test_it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['app/Jobs/A.php' => self::HEAD . "final class A implements ShouldBeUnique, ShouldQueue { public function __construct() { \$this->onQueue('pdf'); } }\n"], '.checkout-');

        try {
            $names = new QueueNameGuard(new CallInspector(), $root, 'app', 'config/horizon.php')->violations();
            $limits = new QueuedClassLimitsGuard(new CallInspector(), $root, 'app', 'config/horizon.php')->violations();
            $unique = new UniqueJobGuard(new CallInspector(), $root, 'app')->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $names);
        self::assertStringStartsWith('app/Jobs/A.php:7: onQueue()', $names[0]);
        self::assertCount(2, $limits);
        self::assertStringStartsWith('app/Jobs/A.php: App\Jobs\A is queued without $timeout', $limits[0]);
        self::assertCount(1, $unique);
        self::assertStringStartsWith('app/Jobs/A.php: App\Jobs\A implements ShouldBeUnique', $unique[0]);
    }

    public function test_it_holds_the_real_tree_to_its_counted_list_and_gives_every_queued_class_its_limits_and_key(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/queue-names.txt')->differences(new QueueNameGuard(new CallInspector(), $root, 'app', 'config/horizon.php')->violations()));
        self::assertSame([], new QueuedClassLimitsGuard(new CallInspector(), $root, 'app', 'config/horizon.php')->violations());
        self::assertSame([], new UniqueJobGuard(new CallInspector(), $root, 'app')->violations());
    }
}
