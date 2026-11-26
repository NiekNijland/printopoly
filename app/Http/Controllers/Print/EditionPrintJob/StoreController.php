<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\EditionPrintJob;

use App\Http\Controllers\Controller;
use App\Http\Requests\Print\StoreEditionPrintJobRequest;
use App\Models\Edition;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Support\EditionPrintJobs;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * The print page of an edition of a logged-in user (B95). There is one job per
 * edition, so the PDFs that are made stay together under Mijn edities. It
 * creates the job only; nothing is generated until the user clicks.
 */
final class StoreController extends Controller
{
    public function __invoke(StoreEditionPrintJobRequest $request, Edition $edition, EditionPrintJobs $jobs): JsonResponse
    {
        Gate::authorize('print', $edition);
        $site = $request->locale() ?? Locale::tryFrom(app()->getLocale()) ?? Locale::default();
        $job = $jobs->forEdition($this->user($request), $edition, $site);

        return response()->json([
            'token' => $job->token,
            'url' => route('print.show', ['locale' => $job->locale, 'printJob' => $job]),
            'statusUrl' => route('print.status', ['printJob' => $job]),
        ], $job->wasRecentlyCreated ? 201 : 200);
    }
}
