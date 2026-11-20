<?php

declare(strict_types=1);

namespace App\Edition;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * The account holds as many editions as it may (B70, B82).
 */
final class EditionLimitReached extends Exception
{
    public function __construct(public readonly int $limit)
    {
        parent::__construct("An account holds at most {$limit} editions.");
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'code' => 'edition_limit',
            'message' => $this->getMessage(),
            'limit' => $this->limit,
        ], 422);
    }
}
