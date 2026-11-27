<?php

declare(strict_types=1);

namespace App\Modules\Print\Services;

use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Print\Data\EditionPrintReadyData;
use App\Modules\Print\Data\PrintJobReadyData;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintSet;
use Illuminate\Database\Eloquent\Collection;

/**
 * Which editions have files ready to download (B95), read from the print jobs and the same status the print page
 * shows: the editions of a user, or the jobs a browser presents by token. Only jobs that still hold a file count.
 */
final readonly class EditionPrintReadinessService
{
    public function __construct(private PrintStatusService $status)
    {
    }

    /**
     * @return list<EditionPrintReadyData>
     */
    public function forUser(User $user): array
    {
        $ready = [];
        $jobs = PrintJob::query()->where('user_id', $user->publicId())->whereNotNull('edition_id')->get();
        $files = $this->partFiles($jobs);

        foreach ($jobs as $job) {
            $state = $this->readiness($job, $files[$job->publicId()] ?? []);

            if ($state === null || $job->edition_id === null) {
                continue;
            }

            $ready[] = new EditionPrintReadyData($job->edition_id, ...$state);
        }

        return $ready;
    }

    /**
     * The jobs behind the tokens a browser keeps next to its editions. The token is the secret of a job, so only
     * jobs whose token is presented are read, and a job of an account only for that account. An unknown token, a
     * job of somebody else and a job without files are left out, so the answer never says whether a token exists.
     *
     * @param list<string> $tokens
     * @return list<PrintJobReadyData>
     */
    public function forTokens(array $tokens, ?User $user): array
    {
        if ($tokens === []) {
            return [];
        }

        $ready = [];
        $jobs = PrintJob::query()->whereIn('token', $tokens)->get();
        $files = $this->partFiles($jobs);

        foreach ($jobs as $job) {
            $mine = $job->isAnonymous() || ($user instanceof User && $job->user_id === $user->publicId());
            $state = $mine ? $this->readiness($job, $files[$job->publicId()] ?? []) : null;

            if ($state === null) {
                continue;
            }

            $ready[] = new PrintJobReadyData($job->token, ...$state);
        }

        return $ready;
    }

    /**
     * The part files of all the jobs in one query, by the id of their job.
     *
     * @param Collection<int, PrintJob> $jobs
     * @return array<string, list<PrintFile>>
     */
    private function partFiles(Collection $jobs): array
    {
        $ids = array_values(array_map(static fn (PrintJob $job): string => $job->publicId(), $jobs->all()));
        $files = [];

        foreach (PrintFile::query()->whereIn('print_job_id', $ids)->where('kind', PrintFile::KIND_PART)->get() as $file) {
            $files[$file->print_job_id][] = $file;
        }

        return $files;
    }

    /**
     * @param list<PrintFile> $files the part files of the job
     * @return array{printerReadyUntil: int|null, printerOutdated: bool, homeReadyUntil: int|null, homeOutdated: bool}|null
     */
    private function readiness(PrintJob $job, array $files): ?array
    {
        $expiry = $this->expiryPerSet($files);

        if ($expiry === []) {
            return null;
        }

        $status = $this->status->resolve($job);
        $outdated = [PrintSet::PRINTER->value => false, PrintSet::HOME->value => false];

        foreach ($status->parts as $part) {
            if ($part->status === PartStatus::OUTDATED) {
                $outdated[$part->set->value] = true;
            }
        }

        $printer = PrintSet::PRINTER->value;
        $home = PrintSet::HOME->value;

        return [
            'printerReadyUntil' => $status->printerZipReady ? ($expiry[$printer] ?? null) : null,
            'printerOutdated' => $outdated[$printer],
            'homeReadyUntil' => $status->homeZipReady ? ($expiry[$home] ?? null) : null,
            'homeOutdated' => $outdated[$home],
        ];
    }

    /**
     * The first time a file of each set goes away, in milliseconds, for the files that are still there.
     *
     * @param list<PrintFile> $files
     * @return array<string, int>
     */
    private function expiryPerSet(array $files): array
    {
        $expiry = [];

        foreach ($files as $file) {
            if ($file->set === null || ! $file->expires_at->isFuture()) {
                continue;
            }

            $at = $file->expires_at->getTimestampMs();
            $expiry[$file->set] = min($expiry[$file->set] ?? $at, $at);
        }

        return $expiry;
    }
}
