<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * The print job as the Inertia page sees it.
 */
#[TypeScript]
final class PrintJobData extends Data
{
    public function __construct(
        public readonly string $token,
        public readonly string $statusUrl,
        public readonly string $generateUrl,
        public readonly ChannelData $channel,
        public readonly PrintJobStatusData $status,
        public readonly bool $anonymous,
        public readonly int $retentionDays,
    ) {
    }
}
