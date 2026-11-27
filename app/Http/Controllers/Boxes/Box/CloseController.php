<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Modules\Boxes\Actions\CloseBox;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class CloseController
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, CloseBox $close, BoxPresenter $presenter): Response
    {
        return $presenter->owner($close->handle($access->owned($request, $boxId)))->toResponse($request)->setStatusCode(Response::HTTP_OK);
    }
}
