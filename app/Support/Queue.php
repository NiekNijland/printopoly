<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The queues of the application. Every case has a Horizon worker in config/horizon.php; Chrome only runs on `PDF`.
 */
enum Queue: string
{
    case DEFAULT = 'default';
    case PDF = 'pdf';
}
