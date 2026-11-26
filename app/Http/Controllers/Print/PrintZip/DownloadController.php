<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintZip;

use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Services\PrintStatusService;
use App\Modules\Print\Support\PrintFileNames;
use App\Modules\Print\Support\PrintJobContext;
use App\Modules\Print\Support\PrintZipBuilder;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * "Drukkerij-set" or "Thuisprint-set" as one ZIP (B71). It only works when
 * every requested part of the set is done and current (B95).
 */
final class DownloadController extends Controller
{
    public function __invoke(PrintJob $printJob, PrintSet $set, PrintStatusService $status, PrintZipBuilder $zips, PrintJobContext $context): BinaryFileResponse
    {
        Gate::authorize('view', $printJob);

        $current = $status->resolve($printJob);
        abort_unless($set === PrintSet::Printer ? $current->printerZipReady : $current->homeZipReady, 409);

        $names = PrintFileNames::for($printJob, $context);
        $path = $zips->build($printJob, $set, $names);

        return response()->download($path, $names->zip($set), ['Content-Type' => 'application/zip'])->deleteFileAfterSend();
    }
}
