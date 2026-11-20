<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\PartStatus;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * One row of the print page (B95): a part in one set, with its status and,
 * when it is done, where to download it.
 */
#[TypeScript]
final class PrintPartStatusData extends Data
{
    public function __construct(
        public readonly PrintSet $set,
        public readonly PrintPart $part,
        public readonly PartStatus $status,
        /** The part this one waits for, while the status is `waiting`. */
        public readonly ?PrintPart $waitingFor,
        public readonly ?int $pages,
        public readonly ?int $bytes,
        public readonly ?string $downloadUrl,
        public readonly ?string $instructionsUrl,
        /** Why the part failed, while the status is `failed`: a `FailureReason` value. */
        public readonly ?string $reason = null,
        /** The PNG to send digitally, for the part that has one (the invitation). */
        public readonly ?string $imageUrl = null,
    ) {
    }
}
