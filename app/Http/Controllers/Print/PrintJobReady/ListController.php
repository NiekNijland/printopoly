<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\PrintJobReady;

use App\Http\Requests\Print\ListPrintJobReadyRequest;
use App\Models\User;
use App\Modules\Print\Services\EditionPrintReadinessService;
use Illuminate\Http\JsonResponse;

/**
 * What is ready to download for the print jobs a browser started for its own editions (B95, bug 14 of the
 * integration check). Without an account Mijn edities only knows the tokens it kept next to each edition, so it
 * sends those. There is no listing: the answer only covers tokens that were sent, and only the jobs the caller may
 * open (a job without an account by its token, a job of an account only for that account).
 */
final readonly class ListController
{
    public function __invoke(ListPrintJobReadyRequest $request, EditionPrintReadinessService $readiness): JsonResponse
    {
        $user = $request->user();

        return response()->json(['jobs' => $readiness->forTokens($request->tokens(), $user instanceof User ? $user : null)])
            ->header('Cache-Control', 'private, no-store');
    }
}
