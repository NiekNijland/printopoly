<?php

declare(strict_types=1);

namespace App\Http\Controllers\Print\EditionPrintReady;

use App\Models\User;
use App\Modules\Print\Data\EditionPrintReadyListData;
use App\Modules\Print\Services\EditionPrintReadinessService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * What is ready to download per edition of the logged-in account, for Mijn edities (B95). Only the user's
 * own print jobs are read, so nobody sees the files of another account.
 */
final readonly class ListController
{
    public function __invoke(#[CurrentUser] User $user, Request $request, EditionPrintReadinessService $readiness): Response
    {
        $response = new EditionPrintReadyListData($readiness->forUser($user))->toResponse($request);
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
