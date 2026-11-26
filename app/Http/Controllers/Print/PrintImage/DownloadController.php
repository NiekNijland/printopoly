<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintImage;

use App\Http\Controllers\Controller;
use App\Integrations\Poppler\PdfRasterizer;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The PNG of a part that has one: the invitation to send digitally (B123).
 * Reachable only through the job it belongs to, like the PDFs.
 */
final class DownloadController extends Controller
{
    public function __invoke(PrintJob $printJob, PrintSet $set, PrintPart $part, PrintJobContext $context): StreamedResponse
    {
        Gate::authorize('view', $printJob);

        $file = PrintFile::query()
            ->where('print_job_id', $printJob->publicId())
            ->where('kind', PrintFile::KIND_IMAGE)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->first();

        abort_unless($file instanceof PrintFile && $file->expires_at->isFuture(), 404);

        return Storage::disk($file->disk)->download($file->path, PrintFileNames::for($printJob, $context)->image($part, PdfRasterizer::PNG_WIDTH), ['Content-Type' => 'image/png']);
    }
}
