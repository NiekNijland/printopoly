<?php

declare(strict_types=1);

namespace App\Modules\Print\Events;

/**
 * The worker of a print run died or timed out (GeneratePrintJob::failed). It is dispatched synchronously, so the
 * listener marks the parts that still wait or run as failed before the queue moves on: nothing stays "waiting".
 */
final readonly class PrintRunFailedEvent
{
    /**
     * @param list<array{string, string}> $targets Pairs of set and part values of the run.
     */
    public function __construct(public string $printJobId, public array $targets)
    {
    }
}
