<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Controllers\Controller;
use App\Models\Edition;
use App\Modules\Editions\Actions\SaveEditionChanges;
use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/**
 * Replaces the whole content of an edition, for a browser that catches up
 * after several offline changes. The body is the edition plus `baseRevision`,
 * the revision the browser last knew of the server. The new revision is the
 * browser's own count when that is higher, so the local copy and the account
 * copy keep the same number (B81).
 */
final class ReplaceController extends Controller
{
    public function __invoke(Request $request, Edition $edition, EditionValidator $validator, SaveEditionChanges $save): JsonResponse
    {
        Gate::authorize('update', $edition);

        $body = $request->json()->all();
        $input = $validator->edition($body);

        if ($input['id'] !== $edition->edition_id) {
            throw ValidationException::withMessages(['edition' => ['id: does not match the edition in the URL']]);
        }

        $base = $body['baseRevision'] ?? null;

        if (! is_int($base) || $base < 0) {
            throw ValidationException::withMessages(['edition' => ['baseRevision: must be a non-negative integer']]);
        }

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
