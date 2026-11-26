<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\Instructions;

use App\Http\Controllers\Controller;
use App\Http\Requests\Print\DownloadInstructionsRequest;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class DownloadController extends Controller
{
    public function __invoke(DownloadInstructionsRequest $request, PrintJob $printJob, PrintPart $part, PrintJobContext $context): StreamedResponse
    {
        Gate::authorize('view', $printJob);

        $set = $request->set();
        $query = PrintFile::query()
            ->where('print_job_id', $printJob->publicId())
            ->where('kind', PrintFile::KIND_INSTRUCTIONS)
            ->where('part', $part->value);

        if ($set instanceof PrintSet) {
            $query->where('set', $set->value);
        }

        $file = $query->first();

        abort_unless($file instanceof PrintFile && $file->expires_at->isFuture(), 404);

        return Storage::disk($file->disk)->download($file->path, PrintFileNames::for($printJob, $context)->instructions($part), ['Content-Type' => 'application/pdf']);
    }
}
