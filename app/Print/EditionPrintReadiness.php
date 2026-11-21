<?php

declare(strict_types=1);

namespace App\Print;

use App\Data\EditionPrintReadyData;
use App\Enums\PartStatus;
use App\Enums\PrintSet;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;

/**
 * Which editions of a user have files ready to download (B95), read from the print jobs and the same status the
 * print page shows. Only the user's own jobs are looked at, and only jobs that still hold a file.
 */
final readonly class EditionPrintReadiness
{
    public function __construct(private PrintStatusResolver $status)
    {
    }

    /**
     * @return list<EditionPrintReadyData>
     */
    public function forUser(User $user): array
    {
        $ready = [];

        foreach (PrintJob::query()->where('user_id', $user->publicId())->whereNotNull('edition_id')->get() as $job) {
            $expiry = $this->expiryPerSet($job);

            if ($expiry === [] || $job->edition_id === null) {
                continue;
            }

            $status = $this->status->resolve($job);
            $outdated = [PrintSet::Printer->value => false, PrintSet::Home->value => false];

            foreach ($status->parts as $part) {
                if ($part->status === PartStatus::Outdated) {
                    $outdated[$part->set->value] = true;
                }
            }

            $printer = PrintSet::Printer->value;
            $home = PrintSet::Home->value;

            $ready[] = new EditionPrintReadyData(
                editionId: $job->edition_id,
                printerReadyUntil: $status->printerZipReady ? ($expiry[$printer] ?? null) : null,
                printerOutdated: $outdated[$printer],
                homeReadyUntil: $status->homeZipReady ? ($expiry[$home] ?? null) : null,
                homeOutdated: $outdated[$home],
            );
        }

        return $ready;
    }

    /**
     * The first time a file of each set goes away, in milliseconds, for the files that are still there.
     *
     * @return array<string, int>
     */
    private function expiryPerSet(PrintJob $job): array
    {
        $expiry = [];

        foreach (PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', PrintFile::KIND_PART)->get() as $file) {
            if ($file->set === null || ! $file->expires_at->isFuture()) {
                continue;
            }

            $at = $file->expires_at->getTimestampMs();
            $expiry[$file->set] = min($expiry[$file->set] ?? $at, $at);
        }

        return $expiry;
    }
}
