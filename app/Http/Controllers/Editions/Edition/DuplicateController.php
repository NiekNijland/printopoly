<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Controllers\Controller;
use App\Http\Requests\Editions\DuplicateEditionRequest;
use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\DuplicateEdition;
use App\Modules\Editions\Support\EditionPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class DuplicateController extends Controller
{
    public function __invoke(DuplicateEditionRequest $request, Edition $edition, DuplicateEdition $duplicate): JsonResponse
    {
        Gate::authorize('view', $edition);

        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $copy = $duplicate->handle($user, $edition, $request->name());

        return response()->json(['edition' => EditionPayload::from($copy)], 201);
    }
}
