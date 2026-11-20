<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions;

use App\Actions\Editions\SaveEditionChanges;
use App\Edition\EditionValidator;
use App\Http\Controllers\Controller;
use App\Models\Edition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * "Naam wijzigen" in the menu of Mijn edities (B96). It is a change like any
 * other, so it needs the revision the list showed and bumps it.
 */
final class RenameEditionController extends Controller
{
    public function __invoke(Request $request, Edition $edition, SaveEditionChanges $save): JsonResponse
    {
        Gate::authorize('update', $edition);

        $request->validate([
            'baseRevision' => ['required', 'integer', 'min:0'],
            'name' => ['required', 'string', 'min:1', 'max:' . EditionValidator::MAX_NAME_LENGTH],
        ]);

        $saved = $save->handle($edition, $request->integer('baseRevision'), ['name' => $request->string('name')->toString()]);

        return response()->json([
            'revision' => $saved->revision,
            'updatedAt' => $saved->updated_at_ms,
            'name' => $saved->name,
        ]);
    }
}
