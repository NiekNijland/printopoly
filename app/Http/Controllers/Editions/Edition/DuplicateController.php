<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Requests\Editions\DuplicateEditionRequest;
use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\DuplicateEdition;
use App\Modules\Editions\Support\EditionPayload;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

final readonly class DuplicateController
{
    public function __invoke(#[CurrentUser] User $user, DuplicateEditionRequest $request, Edition $edition, DuplicateEdition $duplicate): JsonResponse
    {
        $copy = $duplicate->handle($user, $edition, $request->name());

        return response()->json(['edition' => EditionPayload::from($copy)], 201);
    }
}
