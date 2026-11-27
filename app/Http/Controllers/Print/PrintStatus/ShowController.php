<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintStatus;

use App\Models\PrintJob;
use App\Modules\Print\Data\PrintJobStatusData;
use App\Modules\Print\Services\PrintStatusService;

final readonly class ShowController
{
    public function __invoke(PrintJob $printJob, PrintStatusService $status): PrintJobStatusData
    {
        return $status->resolve($printJob);
    }
}
