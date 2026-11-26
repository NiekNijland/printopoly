<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Models\Edition;
use App\Modules\Editions\Support\EditionPayload;
use Illuminate\Http\JsonResponse;

final readonly class ShowController
{
    public function __invoke(Edition $edition): JsonResponse
    {
        return response()->json(['edition' => EditionPayload::from($edition)]);
    }
}
