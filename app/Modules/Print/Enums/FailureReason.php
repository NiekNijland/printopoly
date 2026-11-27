<?php

declare(strict_types=1);

namespace App\Modules\Print\Enums;

use App\Modules\Print\Exceptions\PrintFailedException;
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
    case TIMEOUT = 'timeout';
    /**
     * A photo is missing, could not be read or did not load while rendering.
     */
    case PHOTOS = 'photos';
    /**
     * The PDF does not match the page plan.
     */
    case LAYOUT = 'layout';
    /**
     * The edition is gone or cannot be read.
     */
    case EDITION = 'edition';
    case OTHER = 'other';

    public static function fromThrowable(Throwable $exception): self
    {
        if ($exception instanceof PrintFailedException) {
            return $exception->reason;
        }

        if (preg_match('/timeout|timedout/i', $exception::class) === 1 || mb_stripos($exception->getMessage(), 'timed out') !== false) {
            return self::TIMEOUT;
        }

        return self::OTHER;
    }
}
