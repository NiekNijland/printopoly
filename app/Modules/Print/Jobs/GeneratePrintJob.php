<?php

declare(strict_types=1);

namespace App\Modules\Print\Jobs;

use App\Models\PrintJob;
use App\Modules\Analytics\Enums\FeatureEvent;
use App\Modules\Analytics\Support\FeatureCounter;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\FailureReason;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Events\PrintRunFailedEvent;
use App\Modules\Print\Support\InstructionPdfBuilder;
use App\Modules\Print\Support\PrintPartBuilder;
use App\Modules\Print\Support\PrintProgress;
use App\Support\Queue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Support\Facades\Event;
use Throwable;

/**
 * Works through the parts of one print run, one at a time, on the `pdf`
 * queue (B70). Every part ends as done or failed and each change goes out to
 * the open print page (B95). A failing part does not stop the others.
 */
#[Timeout(300)]
#[Tries(1)]
final class GeneratePrintJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param list<array{string, string}> $targets Pairs of set and part values, in the order to work.
     */
    public function __construct(
        public readonly string $printJobId,
        public readonly array $targets,
    ) {
        $this->onQueue(Queue::PDF);
    }

    public function handle(PrintPartBuilder $parts, InstructionPdfBuilder $instructions, PrintProgress $progress, FeatureCounter $counter): void
    {
        $job = PrintJob::query()->find($this->printJobId);

        if (! $job instanceof PrintJob) {
            return;
        }

        $locale = Locale::tryFrom($job->locale) ?? Locale::default();

        try {
            foreach ($this->targets as [$setValue, $partValue]) {
                $set = PrintSet::from($setValue);
                $part = PrintPart::tryFrom($partValue);

                // A part that is gone since the job was queued (B200) is left out.
                if (! $part instanceof PrintPart) {
                    continue;
                }

                $progress->record($job, $set, $part, PartStatus::RUNNING);

                try {
                    $file = $parts->build($job, $set, $part);
                    $instructions->ensure($job, $part, $locale, $set);
                    $progress->record($job, $set, $part, PartStatus::DONE, cacheKey: $file->cache_key);
                    // Anonymous: only that a part was made today (B206).
                    $counter->count(FeatureEvent::printed($part));
                } catch (Throwable $exception) {
                    // The log has the cause. The page shows the short reason.
                    report($exception);
                    $progress->record($job, $set, $part, PartStatus::FAILED, error: FailureReason::fromThrowable($exception)->value);
                }
            }

            $this->afterRun($job, $instructions, $locale);
        } finally {
            $progress->setActive($job, false);
            $progress->broadcast($job);
        }
    }

    /**
     * The sets of this run get an order sheet that lists what they hold (B185), and the parts made earlier get their
     * instructions again when the user prints from a site in another language now (B184). Text that did not change
     * is reused, so this costs nothing on a plain run. A failure here never fails a part.
     */
    private function afterRun(PrintJob $job, InstructionPdfBuilder $instructions, Locale $locale): void
    {
        $sets = array_unique(array_map(static fn (array $target): string => $target[0], $this->targets));
        $fresh = $job->fresh() ?? $job;

        foreach ($sets as $setValue) {
            $instructions->refreshSet($fresh, PrintSet::from($setValue), $locale);
        }
    }

    /**
     * The worker died or timed out: nothing may stay "waiting" or "running" (MarkFailedPrintRun does the marking).
     */
    public function failed(Throwable $exception): void
    {
        unset($exception);
        Event::dispatch(new PrintRunFailedEvent($this->printJobId, $this->targets));
    }
}
