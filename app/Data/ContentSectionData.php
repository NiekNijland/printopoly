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
    /**
     * @param list<ContentBlockData> $blocks the "###" blocks; `html` holds only the text before the first one
     */
    public function __construct(
        public readonly string $id,
        public readonly string $title,
        public readonly string $html,
        public readonly array $blocks = [],
    ) {
    }
}
