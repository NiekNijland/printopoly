<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Support\TemporaryFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

/**
 * Builds "Drukkerij-set" or "Thuisprint-set" (B71) from the finished PDFs of a job, with the order sheet first
 * (B185) and the instruction PDF of each part in a folder, numbered like its PDF. The names carry the edition and
 * follow the language of the site the user prints from (B184). The test sheet is a row of its own and never goes in
 * a ZIP (B95).
 */
final readonly class PrintZipBuilder
{
    public function __construct(private InstructionPdfBuilder $instructions)
    {
    }

    /**
     * @return string Path of a temporary ZIP file. The caller deletes it.
     *
     * @throws PrintFailed
     */
    public function build(PrintJob $job, PrintSet $set, PrintFileNames $names): string
    {
        $parts = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_PART)
            ->where('set', $set->value)
            // Only parts this version prints: no test sheet, and nothing of a part that is gone (B200).
            ->whereIn('part', array_map(static fn (PrintPart $part): string => $part->value, PrintPart::production()))
            // A part taken out of the set after it was made stays on the job, but not in the ZIP (B210).
            ->whereNotIn('part', array_map(static fn (PrintPart $part): string => $part->value, $job->choiceFor($set)->skipped))
            ->get()
            ->sortBy(static fn (PrintFile $file): int => (int) array_search($file->printPart(), PrintPart::cases(), true))
            ->values();

        throw_if($parts->isEmpty(), PrintFailed::class, 'There is nothing to put in the ZIP.');

        $path = TemporaryFile::create('printopoly-zip-');
        throw_if($path === null, PrintFailed::class, 'No temporary file for the ZIP.');

        $zip = new ZipArchive();
        throw_if($zip->open($path, ZipArchive::OVERWRITE) !== true, PrintFailed::class, 'The ZIP could not be created.');

        // The status only offers the ZIP once the queue made the sheet, or could not (B230, B235). Never rendered here:
        // this runs in a web request.
        $orderSheet = $this->instructions->currentOrderSheet($job, $set, $names->locale);

        if ($orderSheet instanceof PrintFile) {
            $this->add($zip, $orderSheet, $names->orderSheet());
        }

        /** @var array<string, int> $numbers */
        $numbers = [];

        foreach ($parts as $index => $file) {
            $number = $index + 1;
            $numbers[$file->part] = $number;

            if (! $this->add($zip, $file, $names->zipEntry($number, $file->printPart()))) {
                $zip->close();
                File::delete($path);
                throw new PrintFailed('A PDF for the ZIP is missing.');
            }
        }

        // The PNG of the invitation goes next to its PDF, for sending it digitally (B123).
        $images = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_IMAGE)
            ->where('set', $set->value)
            ->get();

        foreach ($images as $file) {
            $number = $numbers[$file->part] ?? null;

            if ($number !== null) {
                $this->add($zip, $file, $names->zipEntry($number, $file->printPart(), 'png', '-' . PdfRasterizer::PNG_WIDTH . 'px'));
            }
        }

        $instructions = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_INSTRUCTIONS)
            ->where('set', $set->value)
            ->whereIn('part', array_keys($numbers))
            ->get();

        foreach ($instructions as $file) {
            $this->add($zip, $file, $names->zipInstructions($numbers[$file->part] ?? 0, $file->printPart()));
        }

        $zip->close();

        return $path;
    }

    private function add(ZipArchive $zip, PrintFile $file, string $name): bool
    {
        $contents = Storage::disk($file->disk)->get($file->path);

        if ($contents === null) {
            return false;
        }

        $zip->addFromString($name, $contents);

        return true;
    }
}
