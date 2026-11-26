<?php

declare(strict_types=1);

namespace App\Modules\Print\Events;

use App\Models\PrintJob;
use App\Modules\Print\Data\PrintJobStatusData;
use App\Modules\Print\Support\PrintChannel;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Override;

/**
 * Tells the open print page that a part changed (B95). It goes out straight
 * from the queue worker to Reverb and carries the same payload as the JSON
 * status endpoint, so the page can use either.
 */
final readonly class PrintStatusUpdatedEvent implements ShouldBroadcastNow
{
    use Dispatchable;

    private Channel $channel;

    /** @var array<mixed> */
    private array $payload;

    public function __construct(PrintJob $job, PrintJobStatusData $status)
    {
        $this->channel = PrintChannel::channel($job);
        $this->payload = $status->toArray();
    }

    #[Override]
    public function broadcastOn(): Channel
    {
        return $this->channel;
    }

    public function broadcastAs(): string
    {
        return 'print.status';
    }

    /**
     * @return array<mixed>
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
