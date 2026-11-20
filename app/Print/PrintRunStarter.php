<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Jobs\GeneratePrintJob;
use App\Models\PrintJob;
use Carbon\CarbonImmutable;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Starts a run on the `pdf` queue after the user clicked "Drukkerij-set
 * maken" or a single part (B95). Nothing is generated before that. One run at
 * a time per job, and per user (B70).
 */
final readonly class PrintRunStarter
{
    public function __construct(private PrintProgress $progress)
    {
    }

    /**
     * @param list<PrintPart> $parts
     *
     * @throws HttpException 409 while this job is busy, 429 while another job of the user is.
     */
    public function start(PrintJob $job, PrintSet $set, array $parts): void
    {
        if ($job->isBusy() || $this->userIsBusy($job)) {
            throw new HttpException(409, 'A print run is already busy.');
        }

        $targets = [];
        $previous = null;

        // Fixed order, whatever order the browser sent: the page says "waits for ..." in that order.
        foreach (PrintPart::cases() as $part) {
            if (! in_array($part, $parts, true)) {
                continue;
            }

            // The test sheet is one file, made once, for the home printer.
            $partSet = $part === PrintPart::Calibration ? PrintSet::Home : $set;
            $targets[] = [$partSet->value, $part->value];

            $this->progress->record($job, $partSet, $part, PartStatus::Waiting, after: $previous);
            $previous = $part;
        }

        if ($targets === []) {
            return;
        }

        $this->progress->setActive($job, true);

        GeneratePrintJob::dispatch($job->publicId(), $targets);
    }

    private function userIsBusy(PrintJob $job): bool
    {
        if ($job->user_id === null) {
            return false;
        }

        $limit = config()->integer('printopoly.limits.print_jobs_per_user');
        $busy = PrintJob::query()
            ->where('user_id', $job->user_id)
            ->where('active_at', '>', CarbonImmutable::now()->subMinutes(PrintProgress::STALE_AFTER_MINUTES)->toDateTime())
            ->count();

        return $busy >= $limit;
    }
}
