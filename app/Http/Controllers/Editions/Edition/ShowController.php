<?php

declare(strict_types=1);

namespace App\Http\Controllers\Editions\Edition;

use App\Models\Edition;
use App\Modules\Editions\Support\EditionPayload;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class ShowController
{
    public function __invoke(Request $request, Edition $edition, EditionPayload $payload): Response
    {
        return $payload->data($edition)->wrap('edition')->toResponse($request);
    }
}
