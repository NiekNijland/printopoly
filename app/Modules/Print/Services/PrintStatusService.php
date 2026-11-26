<?php

declare(strict_types=1);

namespace App\Modules\Print\Services;

use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Data\PrintJobStatusData;
use App\Modules\Print\Data\PrintPartStatusData;
use App\Modules\Print\Enums\FailureReason;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Jobs\RefreshPrintTextsJob;
use App\Modules\Print\Support\InstructionPdfBuilder;
use App\Modules\Print\Support\PrintCacheKey;
use App\Modules\Print\Support\PrintJobContext;
use Illuminate\Support\Facades\Cache;

/**
 * Works out what the print page shows per part (B95): what the queue
 * recorded, with "outdated" derived by comparing the cache key of the
 * edition as it is now to the one the PDF was made from (B62).
 */
final readonly class PrintStatusService
{
    public function __construct(private PrintJobContext $context, private InstructionPdfBuilder $instructions)
    {
    }

    public function resolve(PrintJob $job): PrintJobStatusData
    {
        $current = $this->currentKeys($job);
        $files = $this->liveFiles($job, PrintFile::KIND_PART);
        $images = $this->liveFiles($job, PrintFile::KIND_IMAGE);

        $parts = [];
        foreach (PrintSet::cases() as $set) {
            foreach (PrintPart::cases() as $part) {
                if ($part !== PrintPart::Calibration || $set === PrintSet::Home) {
                    $parts[] = $this->partStatus($job, $set, $part, $files, $images, $current);
                }
            }
        }

        $zipAny = [];
        $zipReady = [];
        foreach (PrintSet::cases() as $set) {
            $zipped = array_filter($parts, static fn (PrintPartStatusData $row): bool => $row->set === $set && $row->part !== PrintPart::Calibration && $row->status !== PartStatus::Idle);
            $zipAny[$set->value] = $zipped !== [];
            $zipReady[$set->value] = array_all($zipped, static fn (PrintPartStatusData $row): bool => $row->status === PartStatus::Done);
        }

        // Every ZIP has its order sheet (B230). A run makes it after its last part, and the ZIP waits for that. Outside
        // a run the sheet is only missing right after the choices of the set changed: the queue makes it and the ZIP
        // waits too, with "ZIP klaarmaken…". A web request never renders a PDF itself: PHP-FPM cannot start Chrome in
        // production (R5-25, B235). Only when the queue could not make the sheet does the ZIP go without one.
        $zipPreparing = false;

        foreach (PrintSet::cases() as $set) {
            if (! $zipAny[$set->value] || ! $zipReady[$set->value] || ! $this->waitsForOrderSheet($job, $set)) {
                continue;
            }

            $zipReady[$set->value] = false;

            if (! $job->isBusy()) {
                $zipPreparing = true;
                dispatch(new RefreshPrintTextsJob($job->publicId(), $set->value));
            }
        }

        return new PrintJobStatusData(
            busy: array_any($parts, static fn (PrintPartStatusData $row): bool => $row->status->isActive()),
            printerZipUrl: route('print.zip', ['printJob' => $job, 'set' => PrintSet::Printer]),
            homeZipUrl: route('print.zip', ['printJob' => $job, 'set' => PrintSet::Home]),
            printerZipReady: $zipAny[PrintSet::Printer->value] && $zipReady[PrintSet::Printer->value],
            homeZipReady: $zipAny[PrintSet::Home->value] && $zipReady[PrintSet::Home->value],
            zipPreparing: $zipPreparing,
            parts: $parts,
        );
    }

    /**
     * @return array<string, PrintFile>
     */
    private function liveFiles(PrintJob $job, string $kind): array
    {
        $files = [];

        foreach (PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', $kind)->get() as $file) {
            if ($file->expires_at->isFuture()) {
                $files[$file->set . '_' . $file->part] = $file;
            }
        }

        return $files;
    }

    /**
     * @param array<string, PrintFile> $files
     * @param array<string, PrintFile> $images
     * @param array<string, string> $current
     */
    private function partStatus(PrintJob $job, PrintSet $set, PrintPart $part, array $files, array $images, array $current): PrintPartStatusData
    {
        $key = PrintJob::stateKey($set, $part);
        $recorded = $job->recordedState($set, $part);
        $file = $files[$key] ?? null;
        $status = $recorded['status'];

        // A run whose worker died never reported back: after the timeout it counts as failed, so retry works.
        if ($status->isActive() && ! $job->isBusy()) {
            $status = PartStatus::Failed;
        }

        if ($status === PartStatus::Done && ($file === null || $recorded['cache_key'] !== ($current[$key] ?? null))) {
            $status = PartStatus::Outdated;
        }

        $done = $status === PartStatus::Done;

        return new PrintPartStatusData(
            set: $set,
            part: $part,
            status: $status,
            waitingFor: $status === PartStatus::Waiting ? $this->waitingFor($job, $set, $part) : null,
            pages: $done ? $file->pages : null,
            bytes: $done ? $file->bytes : null,
            downloadUrl: $done ? route('print.download', ['printJob' => $job, 'set' => $set, 'part' => $part]) : null,
            instructionsUrl: $done ? route('print.instructions', ['printJob' => $job, 'part' => $part, 'set' => $set->value]) : null,
            reason: $status === PartStatus::Failed ? ($recorded['error'] ?? FailureReason::Timeout->value) : null,
            imageUrl: $done && isset($images[$key]) ? route('print.image', ['printJob' => $job, 'set' => $set, 'part' => $part]) : null,
        );
    }

    private function waitsForOrderSheet(PrintJob $job, PrintSet $set): bool
    {
        if ($this->instructions->currentOrderSheet($job, $set, $this->locale($job)) instanceof PrintFile) {
            return false;
        }

        return $job->isBusy() || ! Cache::has(RefreshPrintTextsJob::failedKey($job, $set));
    }

    /**
     * The cache key each part would get right now. Empty when the edition
     * cannot be read any more: every finished part then reads as outdated.
     *
     * @return array<string, string>
     */
    private function currentKeys(PrintJob $job): array
    {
        $keys = [];

        try {
            foreach (PrintSet::cases() as $set) {
                // The frames of the photos differ per set, and so does which photos are needed.
                $edition = $this->context->edition($job, $set);
                $assets = $this->context->assets($job, $edition);

                foreach (PrintPart::cases() as $part) {
                    $scoped = $edition->onlyFor($part);
                    $keys[PrintJob::stateKey($set, $part)] = PrintCacheKey::make($part, $set, $scoped, $this->context->checksumsFor($scoped, $assets));
                }
            }
        } catch (PrintFailedException) {
            return [];
        }

        return $keys;
    }

    private function locale(PrintJob $job): Locale
    {
        return Locale::tryFrom($job->locale) ?? Locale::default();
    }

    private function waitingFor(PrintJob $job, PrintSet $set, PrintPart $part): ?PrintPart
    {
        $entry = ($job->states ?? [])[PrintJob::stateKey($set, $part)] ?? null;
        $after = is_array($entry) ? ($entry['after'] ?? null) : null;

        return is_string($after) ? PrintPart::tryFrom($after) : null;
    }
}
