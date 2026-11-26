<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Controllers\Controller;
use App\Models\Edition;
use App\Modules\Editions\Support\EditionPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class ShowController extends Controller
{
    public function __invoke(Edition $edition, EditionPayload $payload): JsonResponse
    {
        Gate::authorize('view', $edition);

        return response()->json(['edition' => $payload->from($edition)]);
    }
}
