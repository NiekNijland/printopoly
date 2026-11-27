<?php

declare(strict_types=1);

namespace App\Modules\Photos\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class EditionPhotoData extends Data
{
    public function __construct(
        public readonly string $id,
        public readonly string $ref,
        public readonly int $width,
        public readonly int $height,
        public readonly string $previewUrl,
    ) {
    }
}
