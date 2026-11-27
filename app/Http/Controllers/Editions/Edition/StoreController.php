<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Http\Requests\Editions\StoreEditionRequest;
use App\Models\User;
use App\Modules\Editions\Actions\StoreEdition;
use App\Modules\Editions\Support\EditionPayload;
use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Container\Attributes\CurrentUser;
use Symfony\Component\HttpFoundation\Response;

/**
 * Stores one edition from the browser in the account, under the id the
 * browser gave it. An id that already exists answers 409 with the server's
 * version; nothing is replaced (B81).
 */
final readonly class StoreController
{
    public function __invoke(#[CurrentUser] User $user, StoreEditionRequest $request, EditionValidator $validator, StoreEdition $store, EditionPayload $payload): Response
    {
        $edition = $store->handle($user, $request->edition($validator));

        return $payload->data($edition)->wrap('edition')->toResponse($request);
    }
}
