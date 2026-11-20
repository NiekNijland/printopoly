<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Which Reverb channel carries the status of a job. A logged-in user gets a
 * private channel that is authorised by policy; a job without an account gets
 * a channel whose name is the secret token (B69).
 */
#[TypeScript]
final class ChannelData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly bool $private,
    ) {
    }
}
