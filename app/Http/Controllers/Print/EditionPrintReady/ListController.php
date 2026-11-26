<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\EditionPrintReady;

use App\Models\User;
use App\Modules\Print\Services\EditionPrintReadinessService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/**
 * What is ready to download per edition of the logged-in account, for Mijn edities (B95). Only the user's
 * own print jobs are read, so nobody sees the files of another account.
 */
final readonly class ListController
{
    public function __invoke(#[CurrentUser] User $user, EditionPrintReadinessService $readiness): JsonResponse
    {
        return response()->json(['editions' => $readiness->forUser($user)])
            ->header('Cache-Control', 'private, no-store');
    }
}
