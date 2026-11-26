<?php

declare(strict_types=1);

namespace App\Modules\Editions\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * The server has another revision than the client expected, or an edition
 * with this id already exists. Nothing is overwritten: the answer is 409 with
 * the server's version, and the user chooses which one to keep (B81).
 */
final class EditionConflictException extends Exception
{
    /**
     * @param array<string, mixed> $current the server's edition, as EditionPayload gives it
     */
    public function __construct(public readonly array $current)
    {
        parent::__construct('The edition has another revision on the server.');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'code' => 'conflict',
            'message' => $this->getMessage(),
            'current' => $this->current,
        ], 409);
    }
}
