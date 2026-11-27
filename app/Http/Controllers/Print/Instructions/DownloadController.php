<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\Instructions;

use App\Http\Requests\Print\DownloadInstructionsRequest;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Services\PrintDownloadService;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final readonly class DownloadController
{
    public function __invoke(DownloadInstructionsRequest $request, PrintJob $printJob, PrintPart $part, PrintJobContext $context, PrintDownloadService $downloads): StreamedResponse
    {
        $file = $downloads->instructions($printJob, $part, $request->set());

        return Storage::disk($file->disk)->download($file->path, PrintFileNames::for($printJob, $context)->instructions($part), ['Content-Type' => 'application/pdf']);
    }
}
