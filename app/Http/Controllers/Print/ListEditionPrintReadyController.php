<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Print\EditionPrintReadiness;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * What is ready to download per edition of the logged-in account, for Mijn edities (B95). Only the user's
 * own print jobs are read, so nobody sees the files of another account.
 */
final class ListEditionPrintReadyController extends Controller
{
    public function __invoke(Request $request, EditionPrintReadiness $readiness): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return response()->json(['editions' => $readiness->forUser($user)])
            ->header('Cache-Control', 'private, no-store');
    }
}
