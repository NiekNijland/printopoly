<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Tests\Support\Architecture\ScheduledTaskGuard;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class ScheduledTaskArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nuse Illuminate\\Support\\Facades\\Schedule;\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function tasksWithoutALock(): iterable
    {
        yield 'a command' => [self::HEAD . "Schedule::command('printopoly:cleanup')->dailyAt('03:30');\n"];
        yield 'a lock without its minutes' => [self::HEAD . "Schedule::command('printopoly:cleanup')->withoutOverlapping()->daily();\n"];
        yield 'the facade by its full name' => ['<?php
\Illuminate' . '\Support\Facades\Schedule::command(\'a\')->hourly();
'];
        yield 'a task held in a variable' => [self::HEAD . "\$task = Schedule::command('a');\n\$task->daily();\n"];
        yield 'the scheduler of withSchedule()' => ["<?php\nuse Illuminate\\Console\\Scheduling\\Schedule;\nreturn function (Schedule \$schedule): void {\n    \$schedule->command('a')->daily();\n};\n"];
    }

    #[Test]
    #[DataProvider('tasksWithoutALock')]
    public function it_detects_a_scheduled_task_without_its_overlap_lock(string $source): void
    {
        $violations = new ScheduledTaskGuard('/', [])->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('a scheduled task without ->withoutOverlapping(<minutes>)', $violations[0]);
    }

    #[Test]
    public function it_accepts_a_task_with_its_lock_and_minutes(): void
    {
        self::assertSame([], new ScheduledTaskGuard('/', [])->inSource(self::HEAD . "Schedule::command('a')->withoutOverlapping(30)->dailyAt('03:30');\n\$task = Schedule::command('b');\n\$task->withoutOverlapping(10);\n"));
    }

    #[Test]
    public function it_reads_a_tree_under_a_dot_directory_and_fails_when_it_reads_no_file(): void
    {
        $root = SourceSandbox::create(['routes/console.php' => self::HEAD . "Schedule::command('a')->daily();\n"], '.checkout-');

        try {
            $violations = new ScheduledTaskGuard($root, ['routes/console.php'])->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('routes/console.php:3:', $violations[0]);

        $this->expectException(RuntimeException::class);
        new ScheduledTaskGuard($root, ['routes/console.php'])->violations();
    }

    #[Test]
    public function it_holds_the_real_tree_to_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/scheduled-task-locks.txt')->differences(new ScheduledTaskGuard($root, ['routes/console.php', 'bootstrap/app.php'])->violations()));
    }
}
