<?php

declare(strict_types=1);

namespace App\Print;

use App\Enums\FailureReason;
use RuntimeException;
use Throwable;

/**
 * Something went wrong while making a part. The message is kept for the log;
 * the print page shows the short reason (B95).
 */
final class PrintFailed extends RuntimeException
{
    public function __construct(string $message = '', int $code = 0, ?Throwable $previous = null, public readonly FailureReason $reason = FailureReason::Other)
    {
        parent::__construct($message, $code, $previous);
    }
}
