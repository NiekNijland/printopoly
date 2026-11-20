<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintFile;
use App\Models\PrintJob;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

/**
 * Builds "Drukkerij-set" or "Thuisprint-set" (B71) from the finished PDFs of
 * a job, with the instruction PDF of each part next to it. The test sheet is a
 * row of its own and never goes in a ZIP (B95).
 */
final class PrintZipBuilder
{
    /**
     * @return string Path of a temporary ZIP file. The caller deletes it.
     *
     * @throws PrintFailed
     */
    public function build(PrintJob $job, PrintSet $set, Locale $locale): string
    {
        $parts = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_PART)
            ->where('set', $set->value)
            ->where('part', '!=', PrintPart::Calibration->value)
            ->get()
            ->sortBy(static fn (PrintFile $file): int => (int) array_search($file->printPart(), PrintPart::cases(), true));

        if ($parts->isEmpty()) {
            throw new PrintFailed('There is nothing to put in the ZIP.');
        }

        $path = tempnam(sys_get_temp_dir(), 'printopoly-zip-');
        if ($path === false) {
            throw new PrintFailed('No temporary file for the ZIP.');
        }

        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new PrintFailed('The ZIP could not be created.');
        }

        $number = 1;
        foreach ($parts as $file) {
            $contents = Storage::disk($file->disk)->get($file->path);
            if ($contents === null) {
                $zip->close();
                @unlink($path);
                throw new PrintFailed('A PDF for the ZIP is missing.');
            }

            $zip->addFromString(sprintf('%02d-%s', $number++, $file->filename), $contents);
        }

        $instructions = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_INSTRUCTIONS)
            ->where('set', $set->value)
            ->whereIn('part', $parts->pluck('part')->all())
            ->get();

        foreach ($instructions as $file) {
            $contents = Storage::disk($file->disk)->get($file->path);
            if ($contents !== null) {
                $zip->addFromString(($locale === Locale::English ? 'instructions/' : 'instructies/') . $file->filename, $contents);
            }
        }

        $zip->close();

        return $path;
    }
}
