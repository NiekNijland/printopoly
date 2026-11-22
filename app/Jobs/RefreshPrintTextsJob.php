<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\Locale;
use App\Enums\PrintSet;
use App\Models\PrintJob;
use App\Models\PrintFile;
use App\Print\InstructionPdfBuilder;
use App\Print\PrintProgress;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * After the print page changed what a set holds (a part skipped, another number of sets), the order sheet and the
 * instructions of the parts that are done follow, so the ZIP says the same as the page (B185). The status also
 * queues it when a ZIP misses its order sheet outside a run (R5-25, B235): the ZIP waits until it is there. Chrome
 * only runs on the `pdf` queue, never in a web request. One per job and set at a time: the status asks for it on
 * every poll.
 */
final class RefreshPrintTextsJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 120;

    public int $uniqueFor = 300;

    public function __construct(
        public readonly string $printJobId,
        public readonly string $set,
    ) {
        $this->onQueue('pdf');
    }

    public function uniqueId(): string
    {
        return $this->printJobId . '|' . $this->set;
    }

    /**
     * Set when the order sheet of a set could not be made: the ZIP then goes without one for a while instead of
     * waiting for ever (B230), and the log has the cause.
     */
    public static function failedKey(PrintJob $job, PrintSet $set): string
    {
        return 'print-order-sheet-failed:' . $job->publicId() . ':' . $set->value;
    }

    public function handle(InstructionPdfBuilder $instructions, PrintProgress $progress): void
    {
        $job = PrintJob::query()->find($this->printJobId);
        $set = PrintSet::tryFrom($this->set);

        if (! $job instanceof PrintJob || ! $set instanceof PrintSet) {
            return;
        }

        $locale = Locale::tryFrom($job->locale) ?? Locale::default();
        $instructions->refreshSet($job, $set, $locale);

        if ($instructions->currentOrderSheet($job, $set, $locale) instanceof PrintFile) {
            Cache::forget(self::failedKey($job, $set));
        } else {
            Cache::put(self::failedKey($job, $set), true, now()->addMinutes(10));
        }

        // The page waits with "ZIP klaarmaken…" and hears it here.
        $progress->broadcast($job);
    }
}
