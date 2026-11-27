<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Models\PrintJob;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Jobs\GeneratePrintJob;
use Illuminate\Support\Facades\Config;
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
     * @param array<string, array<string, array{w: float, h: float}>>|null $photoTargets Frame sizes of the visible photos, measured by the browser.
     *
     * @throws HttpException 409 while this job is busy, 429 while another job of the user is.
     */
    public function start(PrintJob $job, PrintSet $set, array $parts, ?array $photoTargets = null): void
    {
        throw_if($job->isBusy() || $this->userIsBusy($job), HttpException::class, 409, 'A print run is already busy.');

        if ($photoTargets !== null) {
            $job->photo_targets = $photoTargets;
            $job->save();
        }

        // Active first: the page must not read the "waiting" parts below as left behind by a dead worker.
        $this->progress->setActive($job, true);

        $targets = [];
        $previous = null;

        // Fixed order, whatever order the browser sent: the page says "waits for ..." in that order.
        foreach (PrintPart::cases() as $part) {
            if (! in_array($part, $parts, true)) {
                continue;
            }

            // The test sheet is one file, made once, for the home printer.
            $partSet = $part === PrintPart::CALIBRATION ? PrintSet::HOME : $set;
            $targets[] = [$partSet->value, $part->value];

            $this->progress->record($job, $partSet, $part, PartStatus::WAITING, after: $previous);
            $previous = $part;
        }

        if ($targets === []) {
            $this->progress->setActive($job, false);

            return;
        }

        dispatch(new GeneratePrintJob($job->publicId(), $targets));
    }

    private function userIsBusy(PrintJob $job): bool
    {
        if ($job->user_id === null) {
            return false;
        }

        $limit = Config::integer('printopoly.limits.print_jobs_per_user');
        $busy = PrintJob::query()
            ->where('user_id', $job->user_id)
            ->where('active_at', '>', now()->subMinutes(PrintProgress::STALE_AFTER_MINUTES)->toDateTime())
            ->count();

        return $busy >= $limit;
    }
}
