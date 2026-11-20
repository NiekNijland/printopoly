<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Enums\Locale;
use App\Enums\PrintSet;
use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Print\PrintStatusResolver;
use App\Print\PrintZipBuilder;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * "Drukkerij-set" or "Thuisprint-set" as one ZIP (B71). It only works when
 * every requested part of the set is done and current (B95).
 */
final class DownloadPrintZipController extends Controller
{
    public function __invoke(PrintJob $printJob, PrintSet $set, PrintStatusResolver $status, PrintZipBuilder $zips): BinaryFileResponse
    {
        Gate::authorize('view', $printJob);

        $current = $status->resolve($printJob);
        abort_unless($set === PrintSet::Printer ? $current->printerZipReady : $current->homeZipReady, 409);

        $locale = Locale::tryFrom($printJob->locale) ?? Locale::default();
        $path = $zips->build($printJob, $set, $locale);

        return response()->download($path, $set->zipName($locale) . '.zip', ['Content-Type' => 'application/zip'])->deleteFileAfterSend();
    }
}
