<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Requests\Boxes\StoreBoxRequest;
use App\Models\User;
use App\Modules\Boxes\Actions\CreateBox;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\JsonResponse;

final readonly class StoreController
{
    public function __invoke(StoreBoxRequest $request, CreateBox $create, BoxPresenter $presenter): JsonResponse
    {
        $user = $request->user();
        $made = $create->handle($user instanceof User ? $user : null, $request->editionId(), $request->editionName(), $request->language(), $request->snapshot(), (string) $request->ip());

        if ($made['secret'] === null) {
            return response()->json($presenter->owner($made['box']));
        }

        return response()->json([...$presenter->owner($made['box']), 'ownerSecret' => $made['secret']], 201);
    }
}
