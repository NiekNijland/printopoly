<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Controllers\Controller;
use App\Http\Requests\Editions\ReplaceEditionRequest;
use App\Models\Edition;
use App\Modules\Editions\Actions\SaveEditionChanges;
use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

/**
 * Replaces the whole content of an edition, for a browser that catches up
 * after several offline changes. The body is the edition plus `baseRevision`,
 * the revision the browser last knew of the server. The new revision is the
 * browser's own count when that is higher, so the local copy and the account
 * copy keep the same number (B81).
 */
final class ReplaceController extends Controller
{
    public function __invoke(ReplaceEditionRequest $request, Edition $edition, EditionValidator $validator, SaveEditionChanges $save): JsonResponse
    {
        Gate::authorize('update', $edition);

        $input = $request->edition($validator, $edition);
        $base = $request->baseRevision();

        $attributes = [
            'name' => $input['name'],
            'language' => $input['language'],
            'currency' => $input['currency'],
            'theme' => $input['theme'],
            'board_profile' => $input['boardProfile'],
            'parts' => $input['parts'],
            'elements' => $input['elements'],
            'money_amount' => $input['moneyAmount'] ?? null,
        ];

        // A browser from before B152 sends no template; the stored one then stays.
        if (isset($input['template'])) {
            $attributes['template'] = $input['template'];
        }

        $saved = $save->handle($edition, $base, $attributes, $input['revision']);

        return response()->json([
            'revision' => $saved->revision,
            'updatedAt' => $saved->updated_at_ms,
        ]);
    }
}
