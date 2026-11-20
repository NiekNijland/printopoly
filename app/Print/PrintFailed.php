<?php

declare(strict_types=1);

namespace App\Print;

use RuntimeException;

/**
 * Something went wrong while making a part. The message is kept for the log
 * only; the print page shows a fixed "failed, try again" (B95).
 */
final class PrintFailed extends RuntimeException
{
}
