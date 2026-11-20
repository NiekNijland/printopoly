<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions;

use App\Actions\Editions\PatchEdition;
use App\Edition\EditionValidator;
use App\Http\Controllers\Controller;
use App\Models\Edition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Autosave: changed settings and changed elements against a base revision.
 * Answers with the new revision, or 409 with the server's version when the
 * revision moved on (B60, B81).
 */
final class PatchEditionController extends Controller
{
    public function __invoke(Request $request, Edition $edition, EditionValidator $validator, PatchEdition $patch): JsonResponse
    {
        Gate::authorize('update', $edition);

        $saved = $patch->handle($edition, $validator->patch($request->json()->all()));

        return response()->json([
            'revision' => $saved->revision,
            'updatedAt' => $saved->updated_at_ms,
        ]);
    }
}
