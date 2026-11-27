<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Link;

use App\Modules\Boxes\Actions\RenewBoxLink;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class RenewController
{
    public function __invoke(Request $request, string $boxId, BoxAccess $access, RenewBoxLink $renew, BoxPresenter $presenter): Response
    {
        return $presenter->owner($renew->handle($access->owned($request, $boxId)))->toResponse($request)->setStatusCode(Response::HTTP_OK);
    }
}
