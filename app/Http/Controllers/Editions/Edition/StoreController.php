<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Editions\Actions\StoreEdition;
use App\Modules\Editions\Support\EditionPayload;
use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Stores one edition from the browser in the account, under the id the
 * browser gave it. An id that already exists answers 409 with the server's
 * version; nothing is replaced (B81).
 */
final class StoreController extends Controller
{
    public function __invoke(Request $request, EditionValidator $validator, StoreEdition $store): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $edition = $store->handle($user, $validator->edition($request->json()->all()));

        return response()->json(['edition' => EditionPayload::from($edition)], 201);
    }
}
