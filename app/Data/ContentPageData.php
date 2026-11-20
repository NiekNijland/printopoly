<?php

declare(strict_types=1);

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * A markdown content file: the front matter, the text under the "#" heading
 * and the "##" sections (B67).
 */
#[TypeScript]
final class ContentPageData extends Data
{
    /**
     * @param list<ContentSectionData> $sections
     */
    public function __construct(
        public readonly string $title,
        /** The <title> of the page; the heading when the front matter has no seo_title. */
        public readonly string $seoTitle,
        public readonly string $description,
        public readonly string $introHtml,
        public readonly array $sections,
    ) {
    }
}
