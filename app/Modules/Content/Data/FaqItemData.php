<?php

declare(strict_types=1);

namespace App\Modules\Content\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
final class FaqItemData extends Data
{
    public function __construct(
        public readonly string $question,
        public readonly string $answerHtml,
    ) {
    }
}
