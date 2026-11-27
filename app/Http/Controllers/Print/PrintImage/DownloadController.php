<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintImage;

use App\Integrations\Poppler\PdfRasterizer;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Services\PrintDownloadService;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The PNG of a part that has one: the invitation to send digitally (B123).
 * Reachable only through the job it belongs to, like the PDFs.
 */
final readonly class DownloadController
{
    public function __invoke(PrintJob $printJob, PrintSet $set, PrintPart $part, PrintJobContext $context, PrintDownloadService $downloads): StreamedResponse
    {
        $file = $downloads->image($printJob, $set, $part);

        return Storage::disk($file->disk)->download($file->path, PrintFileNames::for($printJob, $context)->image($part, PdfRasterizer::PNG_WIDTH), ['Content-Type' => 'image/png']);
    }
}
