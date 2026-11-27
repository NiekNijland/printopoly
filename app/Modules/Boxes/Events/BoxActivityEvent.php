<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Events;

use App\Models\CollectionBox;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Override;

/**
 * Tells the owner's open editor that something arrived in a box (B128). The channel name is a random value only
 * the owner knows (`CollectionBox::$channel`), and the message carries nothing but a count: the editor fetches
 * the contributions through the authorised route.
 */
final readonly class BoxActivityEvent implements ShouldBroadcastNow
{
    private string $channel;

    public function __construct(CollectionBox $box, public int $pending)
    {
        $this->channel = 'box-owner.' . $box->channel;
    }

    #[Override]
    public function broadcastOn(): Channel
    {
        return new Channel($this->channel);
    }

    public function broadcastAs(): string
    {
        return 'box.activity';
    }

    /**
     * @return array{pending: int}
     */
    public function broadcastWith(): array
    {
        return ['pending' => $this->pending];
    }
}
