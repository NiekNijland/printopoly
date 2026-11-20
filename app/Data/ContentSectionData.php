<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * One "##" section of a content file, rendered to HTML on the server.
 */
#[TypeScript]
final class ContentSectionData extends Data
{
    public function __construct(
        public readonly string $id,
        public readonly string $title,
        public readonly string $html,
    ) {
    }
}
