<?php

declare(strict_types=1);

namespace App\Enums;

use App\Print\PrintFailed;
use Throwable;

/**
 * Why a part of a print run failed, in a form the print page can show (B95). The code goes to the browser;
 * the full cause stays in the log.
 */
enum FailureReason: string
{
    /**
     * Chrome or a helper did not finish in time, for example a sheet with many photos.
     */
    case Timeout = 'timeout';
    /**
     * A photo is missing, could not be read or did not load while rendering.
     */
    case Photos = 'photos';
    /**
     * The PDF does not match the page plan.
     */
    case Layout = 'layout';
    /**
     * The edition is gone or cannot be read.
     */
    case Edition = 'edition';
    case Other = 'other';

    public static function fromThrowable(Throwable $exception): self
    {
        if ($exception instanceof PrintFailed) {
            return $exception->reason;
        }

        if (preg_match('/timeout|timedout/i', $exception::class) === 1 || stripos($exception->getMessage(), 'timed out') !== false) {
            return self::Timeout;
        }

        return self::Other;
    }
}
