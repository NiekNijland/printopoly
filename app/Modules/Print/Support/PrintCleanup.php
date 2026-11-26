<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;

/**
 * Removes what has outlived its 7 days (B62, B80): print jobs without an
 * account together with their photos and PDFs, and the PDFs of jobs with an
 * account (those jobs stay, and the next download makes the PDF again).
 */
final class PrintCleanup
{
    /**
     * @return array{jobs: int, files: int, assets: int}
     */
    public function run(): array
    {
        $now = now();
        $counts = ['jobs' => 0, 'files' => 0, 'assets' => 0];

        foreach (PrintJob::query()->where('expires_at', '<', $now->toDateTime())->get() as $job) {
            $deleted = $this->deleteJob($job);
            $counts['jobs']++;
            $counts['files'] += $deleted['files'];
            $counts['assets'] += $deleted['assets'];
        }

        foreach (PrintFile::query()->where('expires_at', '<', $now->toDateTime())->get() as $file) {
            Storage::disk($file->disk)->delete($file->path);
            $file->delete();
            $counts['files']++;
        }

        // Photos of an anonymous job whose job document is already gone.
        foreach (Asset::query()->where('expires_at', '<', $now->toDateTime())->get() as $asset) {
            $this->deleteAsset($asset);
            $counts['assets']++;
        }

        return $counts;
    }

    /**
     * @return array{files: int, assets: int}
     */
    public function deleteJob(PrintJob $job): array
    {
        $files = 0;
        $assets = 0;

        foreach (PrintFile::query()->where('print_job_id', $job->publicId())->get() as $file) {
            Storage::disk($file->disk)->delete($file->path);
            $file->delete();
            $files++;
        }

        foreach (Asset::query()->where('print_job_id', $job->publicId())->get() as $asset) {
            $this->deleteAsset($asset);
            $assets++;
        }

        Storage::disk(Config::string('printopoly.storage.disk'))->deleteDirectory('print-work/' . $job->publicId());
        $job->delete();

        return ['files' => $files, 'assets' => $assets];
    }

    /**
     * An edition is gone from the account (EditionDeletedEvent): its print job with the PDFs, and its photos.
     */
    public function deleteEdition(string $userId, string $editionId): void
    {
        foreach (PrintJob::query()->where('user_id', $userId)->where('edition_id', $editionId)->get() as $job) {
            $this->deleteJob($job);
        }

        foreach (Asset::query()->where('user_id', $userId)->where('edition_id', $editionId)->get() as $asset) {
            $this->deleteAsset($asset);
        }
    }

    /**
     * An account is deleted (AccountDeletingEvent, B68): every job, PDF and photo of the user.
     */
    public function deleteUser(string $userId): void
    {
        foreach (PrintJob::query()->where('user_id', $userId)->get() as $job) {
            $this->deleteJob($job);
        }

        foreach (Asset::query()->where('user_id', $userId)->get() as $asset) {
            $this->deleteAsset($asset);
        }
    }

    private function deleteAsset(Asset $asset): void
    {
        Storage::disk($asset->disk)->delete([$asset->preview_path, $asset->print_path]);
        $asset->delete();
    }
}
