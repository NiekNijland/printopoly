<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Http\Middleware\SetSecurityHeaders;
use Tests\TestCase;

final class SetSecurityHeadersTest extends TestCase
{
    public function test_a_page_carries_the_content_security_policy_in_report_only_form(): void
    {
        $response = $this->get('/nl');

        $response->assertOk();
        $response->assertHeaderMissing('Content-Security-Policy');
        $response->assertHeader('Content-Security-Policy-Report-Only', SetSecurityHeaders::policy());
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    public function test_the_policy_names_what_the_pages_load(): void
    {
        $policy = SetSecurityHeaders::policy();

        self::assertStringStartsWith("default-src 'self'; script-src 'self' 'wasm-unsafe-eval' ", $policy);
        self::assertStringContainsString("img-src 'self' data: blob:", $policy);
        self::assertStringContainsString('https://notify.bugsnag.com', $policy);
        self::assertStringContainsString("object-src 'none'", $policy);
        self::assertStringNotContainsString('localhost', $policy);
    }

    public function test_the_vite_development_server_joins_the_sources(): void
    {
        $policy = SetSecurityHeaders::policy('http://localhost:5173');

        self::assertStringContainsString("script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com http://localhost:5173;", $policy);
        self::assertStringContainsString('ws://localhost:5173', $policy);
    }

    public function test_a_json_answer_carries_the_policy_too(): void
    {
        $this->getJson('/api/print/missing/status')->assertHeader('Content-Security-Policy-Report-Only', SetSecurityHeaders::policy());
    }
}
