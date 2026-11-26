<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Requests\Boxes\UpdateBoxRequest;
use App\Modules\Boxes\Actions\UpdateBox;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\JsonResponse;

final readonly class UpdateController
{
    public function __invoke(UpdateBoxRequest $request, string $boxId, BoxAccess $access, UpdateBox $update, BoxPresenter $presenter): JsonResponse
    {
        $box = $update->handle($access->owned($request, $boxId), $request->cardsHidden(), $request->snapshot(), $request->editionName());

        return response()->json($presenter->owner($box));
    }
}
