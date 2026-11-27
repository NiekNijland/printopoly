<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Requests\Boxes\StoreBoxRequest;
use App\Models\User;
use App\Modules\Boxes\Actions\CreateBox;
use App\Modules\Boxes\Support\BoxPresenter;
use Symfony\Component\HttpFoundation\Response;

final readonly class StoreController
{
    public function __invoke(StoreBoxRequest $request, CreateBox $create, BoxPresenter $presenter): Response
    {
        $user = $request->user();
        $made = $create->handle($user instanceof User ? $user : null, $request->editionId(), $request->editionName(), $request->language(), $request->snapshot(), (string) $request->ip());

        $box = $presenter->owner($made['box'], $made['secret'])->toResponse($request);

        return $made['secret'] === null ? $box->setStatusCode(Response::HTTP_OK) : $box;
    }
}
