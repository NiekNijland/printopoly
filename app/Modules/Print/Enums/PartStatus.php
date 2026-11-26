<?php

declare(strict_types=1);

namespace App\Modules\Print\Enums;

/**
 * What the print page shows per part (B95). `Idle` is the state before the
 * user clicked anything: nothing is generated until then.
 */
enum PartStatus: string
{
    case Idle = 'idle';
    case Waiting = 'waiting';
    case Running = 'running';
    case Done = 'done';
    case Failed = 'failed';
    case Outdated = 'outdated';

    public function isActive(): bool
    {
        return $this === self::Waiting || $this === self::Running;
    }
}
