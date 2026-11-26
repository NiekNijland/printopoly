<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Http\Controllers\Controller;
use App\Models\Edition;
use App\Modules\Content\Enums\Locale;
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
        $request->validate(['locale' => ['nullable', 'in:' . implode(',', Locale::values())]]);

        // The language of the site the user prints from (B184); the edition can be in another one.
        $site = Locale::tryFrom($request->string('locale')->toString()) ?? Locale::tryFrom(app()->getLocale()) ?? Locale::default();
        $job = $jobs->forEdition($this->user($request), $edition, $site);

        return response()->json([
            'token' => $job->token,
            'url' => route('print.show', ['locale' => $job->locale, 'printJob' => $job]),
            'statusUrl' => route('print.status', ['printJob' => $job]),
        ], $job->wasRecentlyCreated ? 201 : 200);
    }
}
