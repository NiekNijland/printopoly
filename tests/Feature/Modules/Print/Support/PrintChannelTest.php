<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\PrintJob;
use App\Modules\Print\Support\PrintChannel;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Tests\TestCase;

final class PrintChannelTest extends TestCase
{
    public function test_a_job_without_an_account_has_a_public_channel_named_after_its_token(): void
    {
        $job = PrintJob::factory()->makeOne(['token' => 'zaterdagclub-token', 'user_id' => null]);

        $data = PrintChannel::data($job);
        $channel = PrintChannel::channel($job);

        self::assertSame('print-anon.zaterdagclub-token', $data->name);
        self::assertFalse($data->private);
        self::assertNotInstanceOf(PrivateChannel::class, $channel);
        self::assertSame('print-anon.zaterdagclub-token', $channel->name);
    }

    public function test_a_job_of_an_account_has_a_private_channel(): void
    {
        $job = PrintJob::factory()->makeOne(['token' => 'molenweg-token', 'user_id' => 'user-anna']);

        $data = PrintChannel::data($job);
        $channel = PrintChannel::channel($job);

        self::assertSame('print-job.molenweg-token', $data->name);
        self::assertTrue($data->private);
        self::assertInstanceOf(PrivateChannel::class, $channel);
        self::assertInstanceOf(Channel::class, $channel);
        self::assertSame('private-print-job.molenweg-token', $channel->name);
    }
}
