<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Content\Support;

use App\Modules\Content\Support\LocalizedUrls;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Tests\TestCase;

final class LocalizedUrlsTest extends TestCase
{
    public function test_a_public_page_links_to_its_slug_in_every_language_with_the_query(): void
    {
        self::assertSame([
            'nl' => url('/nl/printgids?ref=app'),
            'en' => url('/en/print-guide?ref=app'),
        ], LocalizedUrls::forRequest($this->routed('/nl/printgids?ref=app')));

        self::assertSame([
            'nl' => url('/nl/vragen'),
            'en' => url('/en/faq'),
        ], LocalizedUrls::forRequest($this->routed('/en/faq')));
    }

    public function test_a_page_with_a_locale_keeps_its_own_parameters_and_the_query(): void
    {
        self::assertSame([
            'nl' => url('/nl/editor/zaterdagclub?tab=bord'),
            'en' => url('/en/editor/zaterdagclub?tab=bord'),
        ], LocalizedUrls::forRequest($this->routed('/nl/editor/zaterdagclub?tab=bord')));

        self::assertSame([
            'nl' => url('/nl/editions'),
            'en' => url('/en/editions'),
        ], LocalizedUrls::forRequest($this->routed('/en/editions')));
    }

    public function test_a_route_without_a_locale_or_without_a_route_links_to_the_home_page(): void
    {
        $home = ['nl' => url('/nl'), 'en' => url('/en')];

        self::assertSame($home, LocalizedUrls::forRequest($this->routed('/up')));
        self::assertSame($home, LocalizedUrls::forRequest(Request::create('/nergens')));
    }

    private function routed(string $uri): Request
    {
        $request = Request::create($uri);
        $route = resolve(Router::class)->getRoutes()->match($request)->bind($request);
        $request->setRouteResolver(static fn () => $route);

        return $request;
    }
}
