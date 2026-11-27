<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintFile;

use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Services\PrintDownloadService;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * One PDF of a part (B71). Only reachable through the job it belongs to, and
 * the job is only reachable through its policy (B69).
 */
final readonly class DownloadController
{
    public function __invoke(PrintJob $printJob, PrintSet $set, PrintPart $part, PrintJobContext $context, PrintDownloadService $downloads): StreamedResponse
    {
        $file = $downloads->part($printJob, $set, $part);

        // The name carries the edition and the language of the site (B184).
        return Storage::disk($file->disk)->download($file->path, PrintFileNames::for($printJob, $context)->part($part, $set), ['Content-Type' => 'application/pdf']);
    }
}
