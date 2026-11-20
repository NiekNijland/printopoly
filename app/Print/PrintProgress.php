<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Events\PrintStatusUpdated;
use App\Models\PrintJob;
use Carbon\CarbonImmutable;

/**
 * Records what the queue is doing per part and tells the open print page. One
 * entry in `states` changes at a time, atomically, so the web request that
 * queues a run and the worker that works through it never overwrite each other.
 */
final readonly class PrintProgress
{
    /**
     * A run that never reported back (killed worker) stops blocking new runs after this, and its
     * parts read as failed so the page offers "Opnieuw proberen". The job timeout is 5 minutes.
     */
    public const int STALE_AFTER_MINUTES = 10;

    public function __construct(private PrintStatusResolver $resolver)
    {
    }

    public function record(
        PrintJob $job,
        PrintSet $set,
        PrintPart $part,
        PartStatus $status,
        ?string $cacheKey = null,
        ?string $error = null,
        ?PrintPart $after = null,
    ): void {
        PrintJob::query()
            ->whereKey($job->getKey())
            ->update(['states.' . PrintJob::stateKey($set, $part) => [
                'status' => $status->value,
                'cache_key' => $cacheKey,
                'error' => $error,
                'after' => $after?->value,
            ]]);

        $this->broadcast($job);
    }

    /**
     * A run starts (true) or ends (false). While it is on, no other run for
     * this job or user starts (B70).
     */
    public function setActive(PrintJob $job, bool $active): void
    {
        PrintJob::query()->whereKey($job->getKey())->update(['active_at' => $active ? CarbonImmutable::now()->toDateTime() : null]);
    }

    public function broadcast(PrintJob $job): void
    {
        $fresh = $job->fresh() ?? $job;

        PrintStatusUpdated::dispatch($fresh, $this->resolver->resolve($fresh));
    }
}
