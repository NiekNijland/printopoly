<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\Locale;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Photos\PhotoCropper;
use App\Photos\PhotoPlacement;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

/**
 * Makes one PDF: one part in one set (B54, B56, B101). Crops the photos
 * (B61), renders the print page with Chrome, holds the result against the
 * expected page plan (B12, B63) and stores it under a cache key (B62). When a
 * current PDF for that key exists it is reused.
 */
final readonly class PrintPartBuilder
{
    public function __construct(
        private PrintJobContext $context,
        private PhotoCropper $cropper,
        private PrintHtmlBuilder $html,
        private PdfRenderer $renderer,
        private PdfInspector $inspector,
    ) {
    }

    /**
     * @throws PrintFailed
     */
    public function build(PrintJob $job, PrintSet $set, PrintPart $part): PrintFile
    {
        $edition = $this->context->edition($job)->onlyFor($part);
        $assets = $this->context->assets($job, $edition);
        $cacheKey = PrintCacheKey::make($part, $set, $edition, $this->context->checksumsFor($edition, $assets));

        $existing = $this->current($job, $set, $part, $cacheKey);
        if ($existing instanceof PrintFile) {
            return $existing;
        }

        $expected = PrintLayout::expect($part, $set, $edition);
        $disk = config()->string('printopoly.storage.disk');
        $workFolder = 'print-work/' . $job->publicId() . '/' . $set->value . '-' . $part->value;

        try {
            $sources = $this->crop($edition, $assets, $disk, $workFolder, $job);
            $html = $this->html->build($part, $set, $edition, $sources, $expected);
            $bytes = $this->renderer->render($html, $expected->widthMm, $expected->heightMm, true);
        } finally {
            Storage::disk($disk)->deleteDirectory($workFolder);
        }

        $pages = $this->check($bytes, $expected);

        $path = 'print/' . $job->publicId() . '/' . substr($cacheKey, 0, 12) . '-' . $set->value . '-' . $part->value . '.pdf';
        Storage::disk($disk)->put($path, $bytes);

        $this->forgetOlder($job, $set, $part);

        $file = new PrintFile([
            'print_job_id' => $job->publicId(),
            'kind' => PrintFile::KIND_PART,
            'part' => $part->value,
            'set' => $set->value,
            'cache_key' => $cacheKey,
            'disk' => $disk,
            'path' => $path,
            'filename' => $part->fileName($job->locale === 'en' ? Locale::English : Locale::Dutch) . '-' . $set->value . '.pdf',
            'bytes' => strlen($bytes),
            'pages' => $pages,
            'expires_at' => $this->expiry($job),
        ]);
        $file->save();

        return $file;
    }

    /**
     * Crops every photo placement of the part and returns the signed URL
     * Chrome fetches each crop from.
     *
     * @param array<string, Asset> $assets
     * @return array<string, string>
     */
    private function crop(PrintEditionData $edition, array $assets, string $disk, string $folder, PrintJob $job): array
    {
        $sources = [];
        $storage = Storage::disk($disk);
        $base = rtrim(config()->string('printopoly.print.render_base_url'), '/');

        URL::forceRootUrl($base);

        try {
            foreach ($edition->placements() as $placement) {
                $sources[$placement->key] = $this->cropOne($placement, $assets, $storage, $folder, $job);
            }
        } finally {
            URL::forceRootUrl(null);
        }

        return $sources;
    }

    /**
     * @param array<string, Asset> $assets
     */
    private function cropOne(PhotoPlacement $placement, array $assets, Filesystem $storage, string $folder, PrintJob $job): string
    {
        $asset = $assets[$placement->assetRef];
        $name = sha1($placement->key) . '.jpg';
        $storage->put($folder . '/' . $name, $this->cropper->crop($asset, $placement));

        return URL::temporarySignedRoute(
            'print.render.crop',
            CarbonImmutable::now()->addMinutes(30),
            ['printJob' => $job->token, 'folder' => basename($folder), 'name' => $name],
        );
    }

    /**
     * @throws PrintFailed
     */
    private function check(string $bytes, ExpectedPdf $expected): int
    {
        $temporary = tempnam(sys_get_temp_dir(), 'printopoly-');

        if ($temporary === false) {
            throw new PrintFailed('No temporary file for the PDF check.');
        }

        try {
            file_put_contents($temporary, $bytes);

            return $this->inspector->assertMatches($temporary, $expected);
        } finally {
            @unlink($temporary);
        }
    }

    private function current(PrintJob $job, PrintSet $set, PrintPart $part, string $cacheKey): ?PrintFile
    {
        $file = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_PART)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->where('cache_key', $cacheKey)
            ->first();

        if (! $file instanceof PrintFile || $file->expires_at->isPast() || ! Storage::disk($file->disk)->exists($file->path)) {
            return null;
        }

        return $file;
    }

    private function forgetOlder(PrintJob $job, PrintSet $set, PrintPart $part): void
    {
        $older = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_PART)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->get();

        foreach ($older as $file) {
            Storage::disk($file->disk)->delete($file->path);
            $file->delete();
        }
    }

    private function expiry(PrintJob $job): CarbonImmutable
    {
        $days = config()->integer('printopoly.print_files.retention_days');
        $expiry = CarbonImmutable::now()->addDays($days);

        return $job->expires_at instanceof CarbonImmutable && $job->expires_at->lessThan($expiry) ? $job->expires_at : $expiry;
    }
}
