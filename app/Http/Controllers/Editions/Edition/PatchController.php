<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Controllers\Controller;
use App\Http\Requests\Editions\PatchEditionRequest;
use App\Models\Edition;
use App\Modules\Editions\Actions\PatchEdition;
use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Autosave: changed settings and changed elements against a base revision.
 * Answers with the new revision, or 409 with the server's version when the
 * revision moved on (B60, B81).
 */
final class PatchController extends Controller
{
    public function __invoke(PatchEditionRequest $request, Edition $edition, EditionValidator $validator, PatchEdition $patch): JsonResponse
    {
        Gate::authorize('update', $edition);

        $saved = $patch->handle($edition, $request->patch($validator));

        return response()->json([
            'revision' => $saved->revision,
            'updatedAt' => $saved->updated_at_ms,
        ]);
    }
}
