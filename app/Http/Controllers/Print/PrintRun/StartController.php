<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintRun;

use App\Http\Requests\Print\StartPrintRunRequest;
use App\Models\PrintJob;
use App\Modules\Print\Actions\StartPrintRun;
use App\Modules\Print\Services\PrintStatusService;
use Symfony\Component\HttpFoundation\Response;

final readonly class StartController
{
    public function __invoke(StartPrintRunRequest $request, PrintJob $printJob, StartPrintRun $start, PrintStatusService $status): Response
    {
        $start->handle($printJob, $request->set(), $request->parts(), $request->locale(), $request->choices(), $request->targets());

        return $status->resolve($printJob->fresh() ?? $printJob)->toResponse($request)->setStatusCode(Response::HTTP_OK);
    }
}
