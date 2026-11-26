<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintStatus;

use App\Http\Controllers\Controller;
use App\Models\PrintJob;
use App\Modules\Print\Data\PrintJobStatusData;
use App\Modules\Print\Services\PrintStatusService;
use Illuminate\Support\Facades\Gate;

final class ShowController extends Controller
{
    public function __invoke(PrintJob $printJob, PrintStatusService $status): PrintJobStatusData
    {
        Gate::authorize('view', $printJob);

        return $status->resolve($printJob);
    }
}
