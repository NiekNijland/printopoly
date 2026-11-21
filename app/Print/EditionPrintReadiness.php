<?php

declare(strict_types=1);

namespace App\Print;

use App\Data\EditionPrintReadyData;
use App\Data\PrintJobReadyData;
use App\Enums\PartStatus;
use App\Enums\PrintSet;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;

/**
 * Which editions have files ready to download (B95), read from the print jobs and the same status the print page
 * shows: the editions of a user, or the jobs a browser presents by token. Only jobs that still hold a file count.
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
            $state = $this->readiness($job);

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

        foreach (PrintJob::query()->whereIn('token', $tokens)->get() as $job) {
            $mine = $job->isAnonymous() || ($user instanceof User && $job->user_id === $user->publicId());
            $state = $mine ? $this->readiness($job) : null;

            if ($state === null) {
                continue;
            }

            $ready[] = new PrintJobReadyData($job->token, ...$state);
        }

        return $ready;
    }

    /**
     * @return array{printerReadyUntil: int|null, printerOutdated: bool, homeReadyUntil: int|null, homeOutdated: bool}|null
     */
    private function readiness(PrintJob $job): ?array
    {
        $expiry = $this->expiryPerSet($job);

        if ($expiry === []) {
            return null;
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
