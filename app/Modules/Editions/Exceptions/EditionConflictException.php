<?php

declare(strict_types=1);

namespace App\Modules\Editions\Exceptions;

use App\Modules\Editions\Data\EditionConflictData;
use App\Modules\Editions\Data\EditionData;
use Exception;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The server has another revision than the client expected, or an edition
 * with this id already exists. Nothing is overwritten: the answer is 409 with
 * the server's version, and the user chooses which one to keep (B81).
 */
final class EditionConflictException extends Exception
{
    /**
     * The server's edition, as EditionPayload::data() gives it.
     */
    public function __construct(public readonly EditionData $current)
    {
        parent::__construct('The edition has another revision on the server.');
    }

    public function render(Request $request): Response
    {
        return new EditionConflictData(code: 'conflict', message: $this->getMessage(), current: $this->current)
            ->toResponse($request)
            ->setStatusCode(Response::HTTP_CONFLICT);
    }
}
