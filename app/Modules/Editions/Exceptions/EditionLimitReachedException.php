<?php

declare(strict_types=1);

namespace App\Modules\Editions\Exceptions;

use App\Modules\Editions\Data\EditionLimitData;
use Exception;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The account holds as many editions as it may (B70, B82).
 */
final class EditionLimitReachedException extends Exception
{
    public function __construct(public readonly int $limit)
    {
        parent::__construct("An account holds at most {$limit} editions.");
    }

    public function render(Request $request): Response
    {
        return new EditionLimitData(code: 'edition_limit', message: $this->getMessage(), limit: $this->limit)
            ->toResponse($request)
            ->setStatusCode(Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
