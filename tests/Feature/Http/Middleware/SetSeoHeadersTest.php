<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use Tests\TestCase;

final class SetSeoHeadersTest extends TestCase
{
    public function test_a_public_page_says_its_language_and_may_be_indexed(): void
    {
        $this->get('/en/faq')
            ->assertOk()
            ->assertHeader('Content-Language', 'en')
            ->assertHeaderMissing('X-Robots-Tag');

        $this->get('/nl')->assertOk()->assertHeader('Content-Language', 'nl');
    }

    public function test_a_private_page_and_a_missing_page_are_not_indexed(): void
    {
        $this->get('/nl/editions')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow')->assertHeaderMissing('Content-Language');
        $this->get('/nl/bestaat-niet')->assertNotFound()->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_the_sitemap_and_a_redirect_carry_no_robots_header(): void
    {
        $this->get('/sitemap.xml')->assertOk()->assertHeaderMissing('X-Robots-Tag');
        $this->get('/', ['Accept-Language' => 'nl'])->assertRedirect('/nl')->assertHeaderMissing('X-Robots-Tag');
    }
}
