<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Data\PrintJobStatusData;
use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Print\PrintStatusResolver;
use Illuminate\Support\Facades\Gate;

final class ShowPrintStatusController extends Controller
{
    public function __invoke(PrintJob $printJob, PrintStatusResolver $status): PrintJobStatusData
    {
        Gate::authorize('view', $printJob);

        return $status->resolve($printJob);
    }
}
