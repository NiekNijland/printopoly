<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions;

use App\Edition\EditionPayload;
use App\Http\Controllers\Controller;
use App\Models\Edition;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class ShowEditionController extends Controller
{
    public function __invoke(Edition $edition): JsonResponse
    {
        Gate::authorize('view', $edition);

        return response()->json(['edition' => EditionPayload::from($edition)]);
    }
}
