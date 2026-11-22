<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Http\Controllers\Controller;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Print\PrintFileNames;
use App\Print\PrintJobContext;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * One PDF of a part (B71). Only reachable through the job it belongs to, and
 * the job is only reachable through its policy (B69).
 */
final class DownloadPrintFileController extends Controller
{
    public function __invoke(PrintJob $printJob, PrintSet $set, PrintPart $part, PrintJobContext $context): StreamedResponse
    {
        Gate::authorize('view', $printJob);

        $file = PrintFile::query()
            ->where('print_job_id', $printJob->publicId())
            ->where('kind', PrintFile::KIND_PART)
            ->where('part', $part->value)
            ->where('set', $set->value)
            ->first();

        abort_unless($file instanceof PrintFile && $file->expires_at->isFuture(), 404);

        // The name carries the edition and the language of the site (B184).
        return Storage::disk($file->disk)->download($file->path, PrintFileNames::for($printJob, $context)->part($part, $set), ['Content-Type' => 'application/pdf']);
    }
}
