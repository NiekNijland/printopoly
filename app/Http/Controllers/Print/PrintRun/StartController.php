<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintRun;

use App\Http\Controllers\Controller;
use App\Http\Requests\Print\StartPrintRunRequest;
use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Services\PrintStatusService;
use App\Modules\Print\Support\PrintChoiceInput;
use App\Modules\Print\Support\PrintRunStarter;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * "Drukkerij-set maken" or a single part (B95). Only the chosen parts are made
 * (B99).
 */
final class StartController extends Controller
{
    public function __invoke(StartPrintRunRequest $request, PrintJob $printJob, PrintRunStarter $starter, PrintStatusService $status): JsonResponse
    {
        Gate::authorize('view', $printJob);

        $parts = $request->parts();
        $set = $request->set();
        $site = $request->locale();

        if ($site instanceof Locale && $site->value !== $printJob->locale && ! $printJob->isBusy()) {
            $printJob->locale = $site->value;
            $printJob->save();
        }

        $choices = $request->choices();

        if ($choices !== null && ! $printJob->isBusy()) {
            $printJob->rememberChoice($set, PrintChoiceInput::merge($choices, $printJob->choiceFor($set)));
        }

        $starter->start($printJob, $set, $parts, $request->targets());

        return response()->json($status->resolve($printJob->fresh() ?? $printJob)->toArray());
    }
}
