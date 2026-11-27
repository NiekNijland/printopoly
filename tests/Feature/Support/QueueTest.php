<?php

declare(strict_types=1);

namespace Tests\Feature\Support;

use App\Modules\Boxes\Jobs\RenderShareImageJob;
use App\Modules\Print\Jobs\GeneratePrintJob;
use App\Modules\Print\Jobs\RefreshPrintTextsJob;
use App\Support\Queue;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Support\Facades\Config;
use PHPUnit\Framework\Attributes\DataProvider;
use ReflectionClass;
use Tests\TestCase;

final class QueueTest extends TestCase
{
    public function test_every_queue_has_a_horizon_worker(): void
    {
        $served = [];

        foreach (Config::array('horizon.defaults') as $supervisor) {
            self::assertIsArray($supervisor);
            self::assertIsArray($supervisor['queue']);
            $served = [...$served, ...$supervisor['queue']];
        }

        foreach (Queue::cases() as $queue) {
            self::assertContains($queue->value, $served, $queue->name . ' has no Horizon worker');
        }
    }

    /**
     * @return iterable<string, array{class-string}>
     */
    public static function jobsOnThePdfQueue(): iterable
    {
        yield 'the print run' => [GeneratePrintJob::class];
        yield 'the refresh of the print texts' => [RefreshPrintTextsJob::class];
        yield 'the share image of a box' => [RenderShareImageJob::class];
    }

    /**
     * @param class-string $job
     */
    #[DataProvider('jobsOnThePdfQueue')]
    public function test_a_pdf_job_stops_before_its_horizon_worker_and_redis_hands_it_out_again_only_after_that(string $job): void
    {
        $attributes = new ReflectionClass($job)->getAttributes(Timeout::class);
        self::assertCount(1, $attributes, $job . ' has no #[Timeout]');
        $timeout = $attributes[0]->newInstance()->timeout;
        $worker = Config::integer('horizon.defaults.supervisor-pdf.timeout');
        $retryAfter = Config::integer('queue.connections.redis.retry_after');

        self::assertGreaterThanOrEqual($timeout, $worker, 'the pdf worker of Horizon stops ' . $job . ' before its own #[Timeout]');
        self::assertGreaterThan($worker, $retryAfter, 'redis hands a job out again (retry_after) while the pdf worker may still run it');
    }
}
