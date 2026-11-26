<?php

declare(strict_types=1);

namespace App\Print;

use App\Data\PrintJobStatusData;
use App\Data\PrintPartStatusData;
use App\Enums\FailureReason;
use App\Enums\Locale;
use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Jobs\RefreshPrintTextsJob;
use App\Models\PrintFile;
use App\Models\PrintJob;
use Illuminate\Support\Facades\Cache;

/**
 * Works out what the print page shows per part (B95): what the queue
 * recorded, with "outdated" derived by comparing the cache key of the
 * edition as it is now to the one the PDF was made from (B62).
 */
final readonly class PrintStatusResolver
{
    public function __construct(private PrintJobContext $context, private InstructionPdfBuilder $instructions)
    {
    }

    public function resolve(PrintJob $job): PrintJobStatusData
    {
        $current = $this->currentKeys($job);

        /** @var array<string, PrintFile> $files */
        $files = [];
        foreach (PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', PrintFile::KIND_PART)->get() as $file) {
            if ($file->expires_at->isFuture()) {
                $files[$file->set . '_' . $file->part] = $file;
            }
        }

        /** @var array<string, PrintFile> $images */
        $images = [];

        foreach (PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', PrintFile::KIND_IMAGE)->get() as $file) {
            if ($file->expires_at->isFuture()) {
                $images[$file->set . '_' . $file->part] = $file;
            }
        }

        $parts = [];
        $busy = false;
        $zipReady = [PrintSet::Printer->value => true, PrintSet::Home->value => true];
        $zipAny = [PrintSet::Printer->value => false, PrintSet::Home->value => false];

        foreach (PrintSet::cases() as $set) {
            foreach (PrintPart::cases() as $part) {
                if ($part === PrintPart::Calibration && $set !== PrintSet::Home) {
                    continue;
                }

                $recorded = $job->recordedState($set, $part);
                $file = $files[PrintJob::stateKey($set, $part)] ?? null;
                $status = $recorded['status'];

                // A run whose worker died never reported back: after the timeout it counts as failed, so retry works.
                if ($status->isActive() && ! $job->isBusy()) {
                    $status = PartStatus::Failed;
                }

                if ($status === PartStatus::Done && ($file === null || $recorded['cache_key'] !== ($current[PrintJob::stateKey($set, $part)] ?? null))) {
                    $status = PartStatus::Outdated;
                }

                if ($status->isActive()) {
                    $busy = true;
                }

                if ($part !== PrintPart::Calibration && $status !== PartStatus::Idle) {
                    $zipAny[$set->value] = true;

                    if ($status !== PartStatus::Done) {
                        $zipReady[$set->value] = false;
                    }
                }

                $done = $status === PartStatus::Done;
                $parts[] = new PrintPartStatusData(
                    set: $set,
                    part: $part,
                    status: $status,
                    waitingFor: $status === PartStatus::Waiting ? $this->waitingFor($job, $set, $part) : null,
                    pages: $done && $file instanceof PrintFile ? $file->pages : null,
                    bytes: $done && $file instanceof PrintFile ? $file->bytes : null,
                    downloadUrl: $done ? route('print.download', ['printJob' => $job, 'set' => $set, 'part' => $part]) : null,
                    instructionsUrl: $done ? route('print.instructions', ['printJob' => $job, 'part' => $part, 'set' => $set->value]) : null,
                    reason: $status === PartStatus::Failed ? ($recorded['error'] ?? FailureReason::Timeout->value) : null,
                    imageUrl: $done && isset($images[PrintJob::stateKey($set, $part)]) ? route('print.image', ['printJob' => $job, 'set' => $set, 'part' => $part]) : null,
                );
            }
        }

        // Every ZIP has its order sheet (B230). A run makes it after its last part, and the ZIP waits for that. Outside
        // a run the sheet is only missing right after the choices of the set changed: the queue makes it and the ZIP
        // waits too, with "ZIP klaarmaken…". A web request never renders a PDF itself: PHP-FPM cannot start Chrome in
        // production (R5-25, B235). Only when the queue could not make the sheet does the ZIP go without one.
        $zipPreparing = false;

        foreach (PrintSet::cases() as $set) {
            if (! $zipAny[$set->value] || ! $zipReady[$set->value] || $this->instructions->currentOrderSheet($job, $set, $this->locale($job)) instanceof PrintFile) {
                continue;
            }

            if ($job->isBusy()) {
                $zipReady[$set->value] = false;

                continue;
            }

            if (Cache::has(RefreshPrintTextsJob::failedKey($job, $set))) {
                continue;
            }

            $zipReady[$set->value] = false;
            $zipPreparing = true;
            dispatch(new RefreshPrintTextsJob($job->publicId(), $set->value));
        }

        return new PrintJobStatusData(
            busy: $busy,
            printerZipUrl: route('print.zip', ['printJob' => $job, 'set' => PrintSet::Printer]),
            homeZipUrl: route('print.zip', ['printJob' => $job, 'set' => PrintSet::Home]),
            printerZipReady: $zipAny[PrintSet::Printer->value] && $zipReady[PrintSet::Printer->value],
            homeZipReady: $zipAny[PrintSet::Home->value] && $zipReady[PrintSet::Home->value],
            zipPreparing: $zipPreparing,
            parts: $parts,
        );
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
        } catch (PrintFailed) {
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
