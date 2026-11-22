<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\Locale;
use App\Enums\PrintSet;
use App\Models\PrintJob;
use App\Print\InstructionPdfBuilder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * After the print page changed what a set holds (a part skipped, another number of sets), the order sheet and the
 * instructions of the parts that are done follow, so the ZIP says the same as the page (B185). Chrome only runs on
 * the `pdf` queue, never in a web request.
 */
final class RefreshPrintTextsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(
        public readonly string $printJobId,
        public readonly string $set,
    ) {
        $this->onQueue('pdf');
    }

    public function handle(InstructionPdfBuilder $instructions): void
    {
        $job = PrintJob::query()->find($this->printJobId);
        $set = PrintSet::tryFrom($this->set);

        if (! $job instanceof PrintJob || ! $set instanceof PrintSet) {
            return;
        }

        $instructions->refreshSet($job, $set, Locale::tryFrom($job->locale) ?? Locale::default());
    }
}
