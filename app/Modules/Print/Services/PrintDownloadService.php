<?php

declare(strict_types=1);

namespace App\Modules\Print\Services;

use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintZipBuilder;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final readonly class PrintDownloadService
{
    public function __construct(
        private PrintStatusService $status,
        private PrintZipBuilder $zips,
    ) {
    }

    /**
     * @throws NotFoundHttpException
     */
    public function part(PrintJob $printJob, PrintSet $set, PrintPart $part): PrintFile
    {
        return $this->live(PrintFile::query()
            ->where('print_job_id', $printJob->publicId())
            ->where('kind', PrintFile::KIND_PART)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->first());
    }

    /**
     * @throws NotFoundHttpException
     */
    public function image(PrintJob $printJob, PrintSet $set, PrintPart $part): PrintFile
    {
        return $this->live(PrintFile::query()
            ->where('print_job_id', $printJob->publicId())
            ->where('kind', PrintFile::KIND_IMAGE)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->first());
    }

    /**
     * @throws NotFoundHttpException
     */
    public function instructions(PrintJob $printJob, PrintPart $part, ?PrintSet $set): PrintFile
    {
        $query = PrintFile::query()
            ->where('print_job_id', $printJob->publicId())
            ->where('kind', PrintFile::KIND_INSTRUCTIONS)
            ->where('part', $part->value);

        if ($set instanceof PrintSet) {
            $query->where('set', $set->value);
        }

        return $this->live($query->first());
    }

    /**
     * @throws ConflictHttpException
     */
    public function zip(PrintJob $printJob, PrintSet $set, PrintFileNames $names): string
    {
        $current = $this->status->resolve($printJob);

        throw_unless($set === PrintSet::PRINTER ? $current->printerZipReady : $current->homeZipReady, ConflictHttpException::class);

        return $this->zips->build($printJob, $set, $names);
    }

    private function live(?PrintFile $file): PrintFile
    {
        return $file instanceof PrintFile && $file->expires_at->isFuture() ? $file : throw new NotFoundHttpException();
    }
}
