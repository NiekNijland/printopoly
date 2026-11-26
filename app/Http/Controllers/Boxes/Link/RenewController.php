<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Link;

use App\Modules\Boxes\Actions\RenewBoxLink;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final readonly class RenewController
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, RenewBoxLink $renew, BoxPresenter $presenter): JsonResponse
    {
        return response()->json($presenter->owner($renew->handle($access->owned($request, $boxId))));
    }
}
