<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Print\EditionPrintReadiness;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * What is ready to download for the print jobs a browser started for its own editions (B95, bug 14 of the
 * integration check). Without an account Mijn edities only knows the tokens it kept next to each edition, so it
 * sends those. There is no listing: the answer only covers tokens that were sent, and only the jobs the caller may
 * open (a job without an account by its token, a job of an account only for that account).
 *
 * Body: `tokens`, a list of at most 50 job tokens.
 */
final class ListPrintJobReadyController extends Controller
{
    public const int MAX_TOKENS = 50;

    public function __invoke(Request $request, EditionPrintReadiness $readiness): JsonResponse
    {
        $request->validate([
            'tokens' => ['present', 'array', 'max:' . self::MAX_TOKENS],
            'tokens.*' => ['string', 'regex:/^[A-Za-z0-9]{40}$/'],
        ]);

        $tokens = [];

        foreach ($request->array('tokens') as $token) {
            if (is_string($token)) {
                $tokens[$token] = $token;
            }
        }

        $user = $request->user();

        return response()->json(['jobs' => $readiness->forTokens(array_values($tokens), $user instanceof User ? $user : null)])
            ->header('Cache-Control', 'private, no-store');
    }
}
