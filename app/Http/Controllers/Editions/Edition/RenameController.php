<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Requests\Editions\RenameEditionRequest;
use App\Models\Edition;
use App\Modules\Editions\Actions\SaveEditionChanges;
use Illuminate\Http\JsonResponse;

/**
 * "Naam wijzigen" in the menu of Mijn edities (B96). It is a change like any
 * other, so it needs the revision the list showed and bumps it.
 */
final readonly class RenameController
{
    public function __invoke(RenameEditionRequest $request, Edition $edition, SaveEditionChanges $save): JsonResponse
    {
        $saved = $save->handle($edition, $request->baseRevision(), ['name' => $request->name()]);

        return response()->json([
            'revision' => $saved->revision,
            'updatedAt' => $saved->updated_at_ms,
            'name' => $saved->name,
        ]);
    }
}
