<?php

declare(strict_types=1);

namespace Tests\Feature\Support;

use App\Support\Queue;
use Illuminate\Support\Facades\Config;
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
}
