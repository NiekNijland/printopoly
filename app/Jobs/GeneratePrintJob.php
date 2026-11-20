<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\Locale;
use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintJob;
use App\Print\InstructionPdfBuilder;
use App\Print\PrintPartBuilder;
use App\Print\PrintProgress;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

/**
 * Works through the parts of one print run, one at a time, on the `pdf`
 * queue (B70). Every part ends as done or failed and each change goes out to
 * the open print page (B95). A failing part does not stop the others.
 */
final class GeneratePrintJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 300;

    /**
     * @param list<array{string, string}> $targets Pairs of set and part values, in the order to work.
     */
    public function __construct(
        public readonly string $printJobId,
        public readonly array $targets,
    ) {
        $this->onQueue('pdf');
    }

    public function handle(PrintPartBuilder $parts, InstructionPdfBuilder $instructions, PrintProgress $progress): void
    {
        $job = PrintJob::query()->find($this->printJobId);

        if (! $job instanceof PrintJob) {
            return;
        }

        $locale = Locale::tryFrom($job->locale) ?? Locale::default();

        try {
            foreach ($this->targets as [$setValue, $partValue]) {
                $set = PrintSet::from($setValue);
                $part = PrintPart::from($partValue);

                $progress->record($job, $set, $part, PartStatus::Running);

                try {
                    $file = $parts->build($job, $set, $part);
                    $instructions->ensure($job, $part, $locale);
                    $progress->record($job, $set, $part, PartStatus::Done, cacheKey: $file->cache_key);
                } catch (Throwable $exception) {
                    // The log has the cause. The page only says "failed, try again".
                    report($exception);
                    $progress->record($job, $set, $part, PartStatus::Failed, error: 'failed');
                }
            }
        } finally {
            $progress->setActive($job, false);
            $progress->broadcast($job);
        }
    }

    /**
     * The worker died or timed out: nothing may stay "waiting" or "running".
     */
    public function failed(Throwable $exception): void
    {
        $job = PrintJob::query()->find($this->printJobId);

        if (! $job instanceof PrintJob) {
            return;
        }

        $progress = resolve(PrintProgress::class);

        foreach ($this->targets as [$setValue, $partValue]) {
            $set = PrintSet::from($setValue);
            $part = PrintPart::from($partValue);

            if ($job->recordedState($set, $part)['status']->isActive()) {
                $progress->record($job, $set, $part, PartStatus::Failed, error: 'failed');
            }
        }

        $progress->setActive($job, false);
    }
}
