<?php

declare(strict_types=1);

namespace App\Modules\Print\Enums;

/**
 * What the print page shows per part (B95). `Idle` is the state before the
 * user clicked anything: nothing is generated until then.
 */
enum PartStatus: string
{
    case IDLE = 'idle';
    case WAITING = 'waiting';
    case RUNNING = 'running';
    case DONE = 'done';
    case FAILED = 'failed';
    case OUTDATED = 'outdated';

    public function isActive(): bool
    {
        return $this === self::WAITING || $this === self::RUNNING;
    }
}
