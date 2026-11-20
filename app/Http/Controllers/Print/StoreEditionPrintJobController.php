<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Http\Controllers\Controller;
use App\Models\Edition;
use App\Print\EditionPrintJobs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * The print page of an edition of a logged-in user (B95). There is one job per
 * edition, so the PDFs that are made stay together under Mijn edities. It
 * creates the job only; nothing is generated until the user clicks.
 */
final class StoreEditionPrintJobController extends Controller
{
    public function __invoke(Request $request, Edition $edition, EditionPrintJobs $jobs): JsonResponse
    {
        Gate::authorize('print', $edition);

        $job = $jobs->forEdition($this->user($request), $edition);

        return response()->json([
            'token' => $job->token,
            'url' => route('print.show', ['locale' => $job->locale, 'printJob' => $job]),
            'statusUrl' => route('print.status', ['printJob' => $job]),
        ], $job->wasRecentlyCreated ? 201 : 200);
    }
}
