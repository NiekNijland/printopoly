<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintRun;

use App\Http\Requests\Print\StartPrintRunRequest;
use App\Models\PrintJob;
use App\Modules\Print\Actions\StartPrintRun;
use App\Modules\Print\Services\PrintStatusService;
use Illuminate\Http\JsonResponse;

final readonly class StartController
{
    public function __invoke(StartPrintRunRequest $request, PrintJob $printJob, StartPrintRun $start, PrintStatusService $status): JsonResponse
    {
        $start->handle($printJob, $request->set(), $request->parts(), $request->locale(), $request->choices(), $request->targets());

        return response()->json($status->resolve($printJob->fresh() ?? $printJob)->toArray());
    }
}
