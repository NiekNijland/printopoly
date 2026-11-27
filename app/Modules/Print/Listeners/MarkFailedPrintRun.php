<?php

declare(strict_types=1);

namespace App\Modules\Print\Listeners;

use App\Models\PrintJob;
use App\Modules\Print\Enums\FailureReason;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Events\PrintRunFailedEvent;
use App\Modules\Print\Support\PrintProgress;

/**
 * A print run whose worker died or timed out: the parts that still wait or run fail with a timeout, the parts that
 * are done stay, and the run is no longer active.
 */
final readonly class MarkFailedPrintRun
{
    public function __construct(private PrintProgress $progress)
    {
    }

    public function handle(PrintRunFailedEvent $event): void
    {
        $job = PrintJob::query()->find($event->printJobId);

        if (! $job instanceof PrintJob) {
            return;
        }

        foreach ($event->targets as [$setValue, $partValue]) {
            $set = PrintSet::from($setValue);
            $part = PrintPart::tryFrom($partValue);

            if ($part instanceof PrintPart && $job->recordedState($set, $part)['status']->isActive()) {
                $this->progress->record($job, $set, $part, PartStatus::FAILED, error: FailureReason::TIMEOUT->value);
            }
        }

        $this->progress->setActive($job, false);
    }
}
