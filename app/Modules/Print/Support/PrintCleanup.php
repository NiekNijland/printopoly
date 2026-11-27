<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;

/**
 * Removes what has outlived its 7 days (B62, B80): print jobs without an account together with their photos and PDFs,
 * and the PDFs of jobs with an account (those jobs stay, and the next download makes the PDF again).
 */
final class PrintCleanup
{
    private const int PAGE = 100;

    /**
     * @return array{jobs: int, files: int, assets: int}
     */
    public function run(): array
    {
        $now = now();
        $counts = ['jobs' => 0, 'files' => 0, 'assets' => 0];

        PrintJob::query()->where('expires_at', '<', $now->toDateTime())->chunkById(self::PAGE, function (Collection $jobs) use (&$counts): void {
            $deleted = $this->deleteJobs($jobs->all());
            $counts['jobs'] += $jobs->count();
            $counts['files'] += $deleted['files'];
            $counts['assets'] += $deleted['assets'];
        });

        $counts['files'] += $this->deleteFiles(PrintFile::query()->where('expires_at', '<', $now->toDateTime()));

        // Photos of an anonymous job whose job document is already gone.
        $counts['assets'] += $this->deleteAssets(Asset::query()->where('expires_at', '<', $now->toDateTime()));

        return $counts;
    }

    /**
     * @return array{files: int, assets: int}
     */
    public function deleteJob(PrintJob $job): array
    {
        return $this->deleteJobs([$job]);
    }

    /**
     * An edition is gone from the account (EditionDeletedEvent): its print job with the PDFs, and its photos.
     */
    public function deleteEdition(string $userId, string $editionId): void
    {
        PrintJob::query()->where('user_id', $userId)->where('edition_id', $editionId)->chunkById(self::PAGE, function (Collection $jobs): void {
            $this->deleteJobs($jobs->all());
        });

        $this->deleteAssets(Asset::query()->where('user_id', $userId)->where('edition_id', $editionId));
    }

    /**
     * An account is deleted (AccountDeletingEvent, B68): every job, PDF and photo of the user.
     */
    public function deleteUser(string $userId): void
    {
        PrintJob::query()->where('user_id', $userId)->chunkById(self::PAGE, function (Collection $jobs): void {
            $this->deleteJobs($jobs->all());
        });

        $this->deleteAssets(Asset::query()->where('user_id', $userId));
    }

    /**
     * @param array<array-key, PrintJob> $jobs
     * @return array{files: int, assets: int}
     */
    private function deleteJobs(array $jobs): array
    {
        $ids = array_values(array_map(static fn (PrintJob $job): string => $job->publicId(), $jobs));
        $files = $this->deleteFiles(PrintFile::query()->whereIn('print_job_id', $ids));
        $assets = $this->deleteAssets(Asset::query()->whereIn('print_job_id', $ids));

        foreach ($jobs as $job) {
            Storage::disk(Config::string('printopoly.storage.disk'))->deleteDirectory('print-work/' . $job->publicId());
            $job->delete();
        }

        return ['files' => $files, 'assets' => $assets];
    }

    /**
     * @param Builder<PrintFile> $query
     * @return int The number of files deleted.
     */
    private function deleteFiles(Builder $query): int
    {
        $deleted = 0;

        $query->chunkById(self::PAGE, static function (Collection $files) use (&$deleted): void {
            foreach ($files as $file) {
                Storage::disk($file->disk)->delete($file->path);
                $file->delete();
                $deleted++;
            }
        });

        return $deleted;
    }

    /**
     * @param Builder<Asset> $query
     * @return int The number of photos deleted.
     */
    private function deleteAssets(Builder $query): int
    {
        $deleted = 0;

        $query->chunkById(self::PAGE, static function (Collection $assets) use (&$deleted): void {
            foreach ($assets as $asset) {
                Storage::disk($asset->disk)->delete([$asset->preview_path, $asset->print_path]);
                $asset->delete();
                $deleted++;
            }
        });

        return $deleted;
    }
}
