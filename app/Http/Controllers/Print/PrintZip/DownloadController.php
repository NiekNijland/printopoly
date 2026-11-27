<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintZip;

use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Services\PrintDownloadService;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * "Drukkerij-set" or "Thuisprint-set" as one ZIP (B71). It only works when
 * every requested part of the set is done and current (B95).
 */
final readonly class DownloadController
{
    public function __invoke(PrintJob $printJob, PrintSet $set, PrintJobContext $context, PrintDownloadService $downloads): BinaryFileResponse
    {
        $names = PrintFileNames::for($printJob, $context);
        $path = $downloads->zip($printJob, $set, $names);

        return response()->download($path, $names->zip($set), ['Content-Type' => 'application/zip'])->deleteFileAfterSend();
    }
}
