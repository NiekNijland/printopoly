<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Controllers\Controller;
use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\DuplicateEdition;
use App\Modules\Editions\Support\EditionPayload;
use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class DuplicateController extends Controller
{
    public function __invoke(Request $request, Edition $edition, DuplicateEdition $duplicate): JsonResponse
    {
        Gate::authorize('view', $edition);

        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $request->validate([
            'name' => ['nullable', 'string', 'min:1', 'max:' . EditionValidator::MAX_NAME_LENGTH],
        ]);

        $name = $request->filled('name') ? $request->string('name')->toString() : null;
        $copy = $duplicate->handle($user, $edition, $name);

        return response()->json(['edition' => EditionPayload::from($copy)], 201);
    }
}
