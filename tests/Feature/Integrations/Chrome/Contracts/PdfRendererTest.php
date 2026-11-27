<?php

declare(strict_types=1);

namespace Tests\Feature\Integrations\Chrome\Contracts;

use App\Integrations\Chrome\ChromePdfRenderer;
use App\Integrations\Chrome\Contracts\PdfRenderer;
use Tests\TestCase;

final class PdfRendererTest extends TestCase
{
    public function test_the_contract_resolves_to_the_chrome_renderer_by_its_attribute(): void
    {
        self::assertInstanceOf(ChromePdfRenderer::class, $this->app->make(PdfRenderer::class));
    }
}
