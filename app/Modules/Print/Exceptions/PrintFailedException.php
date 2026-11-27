<?php

declare(strict_types=1);

namespace App\Modules\Print\Exceptions;

use App\Modules\Print\Enums\FailureReason;
use RuntimeException;
use Throwable;

/**
 * Something went wrong while making a part. The message is kept for the log;
 * the print page shows the short reason (B95).
 */
final class PrintFailedException extends RuntimeException
{
    public function __construct(string $message = '', int $code = 0, ?Throwable $previous = null, public readonly FailureReason $reason = FailureReason::OTHER)
    {
        parent::__construct($message, $code, $previous);
    }
}
