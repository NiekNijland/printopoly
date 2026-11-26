<?php

declare(strict_types=1);

namespace App\Modules\Content\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * One "###" block inside a "##" section: a column such as "At home", with an
 * optional spec line (a paragraph that holds only inline code) or numbered
 * steps (B67).
 */
#[TypeScript]
final class ContentBlockData extends Data
{
    /**
     * @param list<string> $steps the numbered items, as inline HTML
     */
    public function __construct(
        public readonly string $title,
        public readonly string $html,
        public readonly ?string $spec = null,
        #[LiteralTypeScriptType('string[]')]
        public readonly array $steps = [],
    ) {
    }
}
