<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Enums\PrintPart;
use App\Http\Controllers\Controller;
use App\Models\PrintFile;
use App\Models\PrintJob;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DownloadInstructionsController extends Controller
{
    public function __invoke(PrintJob $printJob, PrintPart $part): StreamedResponse
    {
        Gate::authorize('view', $printJob);

        $file = PrintFile::query()
            ->where('print_job_id', $printJob->publicId())
            ->where('kind', PrintFile::KIND_INSTRUCTIONS)
            ->where('part', $part->value)
            ->first();

        abort_unless($file instanceof PrintFile && $file->expires_at->isFuture(), 404);

        return Storage::disk($file->disk)->download($file->path, $file->filename, ['Content-Type' => 'application/pdf']);
    }
}
