<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Requests\Boxes\ListBoxesRequest;
use App\Models\CollectionBox;
use App\Models\User;
use App\Modules\Boxes\Data\AccountBoxData;
use App\Modules\Boxes\Support\BoxPresenter;
use Illuminate\Container\Attributes\CurrentUser;
use Symfony\Component\HttpFoundation\Response;

/**
 * The live box of an edition of the logged-in account (B128), so a second device finds the link and the
 * contributions without the owner secret from the first browser. Only the user's own boxes.
 */
final readonly class ListController
{
    public function __invoke(#[CurrentUser] User $user, ListBoxesRequest $request, BoxPresenter $presenter): Response
    {
        $editionId = $request->editionId();
        $box = CollectionBox::query()
            ->where('user_id', $user->publicId())
            ->where('edition_id', $editionId)
            ->where('expires_at', '>', now()->toDateTime())
            ->first();

        $response = new AccountBoxData($box instanceof CollectionBox ? $presenter->owner($box) : null)->toResponse($request);
        $response->headers->set('Cache-Control', 'private, no-store');

        return $response;
    }
}
