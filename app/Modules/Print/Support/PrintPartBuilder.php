<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Integrations\Chrome\Contracts\PdfRenderer;
use App\Integrations\Poppler\PdfRasterizer;
use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Photos\Support\PhotoCropper;
use App\Modules\Photos\ValueObjects\PhotoPlacement;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\ValueObjects\ExpectedPdf;
use App\Support\TemporaryFile;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\File;
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
        private PdfRasterizer $rasterizer,
    ) {
    }

    /**
     * @throws PrintFailedException
     */
    public function build(PrintJob $job, PrintSet $set, PrintPart $part): PrintFile
    {
        $edition = $this->context->edition($job, $set)->onlyFor($part);
        $assets = $this->context->assets($job, $edition);
        $cacheKey = PrintCacheKey::make($part, $set, $edition, $this->context->checksumsFor($edition, $assets));

        $existing = $this->current($job, $set, $part, $cacheKey);
        if ($existing instanceof PrintFile) {
            return $existing;
        }

        // The same PDF made for an earlier version of the edition: take it over instead of making it again.
        $carried = $this->fromPrevious($job, $set, $part, $cacheKey);
        if ($carried instanceof PrintFile) {
            return $carried;
        }

        $expected = PrintLayout::expect($part, $set, $edition);
        $disk = config()->string('printopoly.storage.disk');
        $workFolder = 'print-work/' . $job->publicId() . '/' . $set->value . '-' . $part->value;

        try {
            $sources = $this->crop($edition, $assets, $disk, $workFolder, $job);
            $html = $this->html->build($part, $set, $edition, $sources, $expected);
            $bytes = $this->renderer->render($html, $expected->widthMm, $expected->heightMm, true);

            // A print-shop page with bleed says where to cut and how far the picture runs on (B160).
            if (PrintLayout::hasMarks($part, $set)) {
                $bytes = PdfBoxes::apply($bytes, PrintLayout::MARKS, PrintLayout::MARKS + config()->float('printopoly.print.bleed_mm'), $expected->widthMm, $expected->heightMm);
            }
        } finally {
            Storage::disk($disk)->deleteDirectory($workFolder);
        }

        [$pages, $image] = $this->check($bytes, $expected, $part, $set);

        $path = 'print/' . $job->publicId() . '/' . substr($cacheKey, 0, 12) . '-' . $set->value . '-' . $part->value . '.pdf';
        Storage::disk($disk)->put($path, $bytes);

        $this->forgetOlder($job, $set, $part);

        if ($image !== null) {
            $this->storeImage($job, $set, $part, $cacheKey, $image, $disk);
        }

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

        foreach ($edition->placements() as $placement) {
            $sources[$placement->key] = self::renderUrl($this->cropOne($placement, $assets, $storage, $folder, $job), $base);
        }

        return $sources;
    }

    /**
     * The link is signed without scheme and host (the route checks a relative signature), so it is valid
     * whichever origin Chrome fetches it from: the loopback server in production, the container locally.
     */
    public static function renderUrl(string $signed, string $base): string
    {
        return $base . '/' . ltrim($signed, '/');
    }

    /**
     * @param array<string, Asset> $assets
     */
    private function cropOne(PhotoPlacement $placement, array $assets, Filesystem $storage, string $folder, PrintJob $job): string
    {
        $asset = $assets[$placement->assetRef];
        $name = hash('sha1', $placement->key) . '.' . PhotoCropper::extension($asset);
        $storage->put($folder . '/' . $name, $this->cropper->crop($asset, $placement));

        return URL::temporarySignedRoute(
            'print.render.crop',
            CarbonImmutable::now()->addMinutes(30),
            ['printJob' => $job->token, 'folder' => basename($folder), 'name' => $name],
            absolute: false,
        );
    }

    /**
     * Holds the PDF against the page plan, and for the invitation also makes its PNG from it.
     *
     * @return array{int, string|null} Page count and the PNG, when this part has one.
     *
     * @throws PrintFailedException
     */
    private function check(string $bytes, ExpectedPdf $expected, PrintPart $part, PrintSet $set): array
    {
        $temporary = TemporaryFile::create('printopoly-');

        throw_if($temporary === null, PrintFailedException::class, 'No temporary file for the PDF check.');

        try {
            file_put_contents($temporary, $bytes);

            $pages = $this->inspector->assertMatches($temporary, $expected);

            if ($part !== PrintPart::Invitation) {
                return [$pages, null];
            }

            $card = PrintLayout::invitationCard($set, config()->float('printopoly.print.bleed_mm'));
            $image = $this->rasterizer->cropToPng($temporary, $expected->widthMm, $card['x'], $card['y'], $card['w'], $card['h']);

            return [$pages, $image['png']];
        } finally {
            File::delete($temporary);
        }
    }

    private function storeImage(PrintJob $job, PrintSet $set, PrintPart $part, string $cacheKey, string $png, string $disk): void
    {
        $older = PrintFile::query()
            ->where('print_job_id', $job->publicId())
            ->where('kind', PrintFile::KIND_IMAGE)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->get();

        foreach ($older as $file) {
            Storage::disk($file->disk)->delete($file->path);
            $file->delete();
        }

        $locale = $job->locale === 'en' ? Locale::English : Locale::Dutch;
        $path = 'print/' . $job->publicId() . '/' . substr($cacheKey, 0, 12) . '-' . $set->value . '-' . $part->value . '.png';
        Storage::disk($disk)->put($path, $png);

        new PrintFile([
            'print_job_id' => $job->publicId(),
            'kind' => PrintFile::KIND_IMAGE,
            'part' => $part->value,
            'set' => $set->value,
            'cache_key' => $cacheKey,
            'disk' => $disk,
            'path' => $path,
            'filename' => $part->fileName($locale) . '-' . PdfRasterizer::PNG_WIDTH . 'px.png',
            'bytes' => strlen($png),
            'pages' => 1,
            'expires_at' => $this->expiry($job),
        ])->save();
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

    /**
     * Ria changed one thing and the set button made all twelve megabytes of money again (UX 3 of test round 4): a
     * changed edition is a new job. A PDF of the earlier job with the same cache key is the same PDF, so it is
     * copied over with its picture, and only what changed is rendered.
     */
    private function fromPrevious(PrintJob $job, PrintSet $set, PrintPart $part, string $cacheKey): ?PrintFile
    {
        if ($job->previous_job_id === null) {
            return null;
        }

        $old = PrintFile::query()
            ->where('print_job_id', $job->previous_job_id)
            ->where('kind', PrintFile::KIND_PART)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->where('cache_key', $cacheKey)
            ->first();

        if (! $old instanceof PrintFile || $old->expires_at->isPast()) {
            return null;
        }

        $bytes = Storage::disk($old->disk)->get($old->path);

        if ($bytes === null) {
            return null;
        }

        $disk = config()->string('printopoly.storage.disk');
        $path = 'print/' . $job->publicId() . '/' . substr($cacheKey, 0, 12) . '-' . $set->value . '-' . $part->value . '.pdf';
        Storage::disk($disk)->put($path, $bytes);
        $this->forgetOlder($job, $set, $part);

        $image = PrintFile::query()
            ->where('print_job_id', $job->previous_job_id)
            ->where('kind', PrintFile::KIND_IMAGE)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->where('cache_key', $cacheKey)
            ->first();
        $png = $image instanceof PrintFile ? Storage::disk($image->disk)->get($image->path) : null;

        if ($png !== null) {
            $this->storeImage($job, $set, $part, $cacheKey, $png, $disk);
        }

        $file = new PrintFile([
            'print_job_id' => $job->publicId(),
            'kind' => PrintFile::KIND_PART,
            'part' => $part->value,
            'set' => $set->value,
            'cache_key' => $cacheKey,
            'disk' => $disk,
            'path' => $path,
            'filename' => $old->filename,
            'bytes' => strlen($bytes),
            'pages' => $old->pages,
            'expires_at' => $this->expiry($job),
        ]);
        $file->save();

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
