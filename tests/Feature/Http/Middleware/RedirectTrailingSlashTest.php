<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Http\Middleware\RedirectTrailingSlash;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

final class RedirectTrailingSlashTest extends TestCase
{
    public function test_a_page_with_a_trailing_slash_moves_permanently_to_the_page_without_it(): void
    {
        $middleware = new RedirectTrailingSlash();
        $next = static fn (): Response => new Response('niet verder');

        $plain = $middleware->handle(Request::create('http://printopoly.test/nl/vragen/'), $next);
        $withQuery = $middleware->handle(Request::create('http://printopoly.test/nl/vragen/?ref=app'), $next);

        self::assertSame(Response::HTTP_MOVED_PERMANENTLY, $plain->getStatusCode());
        self::assertSame('http://printopoly.test/nl/vragen', $plain->headers->get('Location'));
        self::assertSame(Response::HTTP_MOVED_PERMANENTLY, $withQuery->getStatusCode());
        self::assertSame('http://printopoly.test/nl/vragen?ref=app', $withQuery->headers->get('Location'));
    }

    public function test_an_app_in_a_subfolder_keeps_its_folder_in_the_redirect(): void
    {
        $request = Request::create('http://printopoly.test/spel/nl/vragen/', 'GET', server: [
            'SCRIPT_FILENAME' => '/var/www/spel/index.php',
            'SCRIPT_NAME' => '/spel/index.php',
        ]);

        $response = new RedirectTrailingSlash()->handle($request, static fn (): Response => new Response('niet verder'));

        self::assertSame('http://printopoly.test/spel/nl/vragen', $response->headers->get('Location'));
    }

    public function test_the_root_and_a_path_without_a_slash_pass_through(): void
    {
        $this->get('/nl/vragen')->assertOk();

        $passed = new RedirectTrailingSlash()->handle(Request::create('/'), static fn (): Response => new Response('voorpagina'));

        self::assertSame('voorpagina', $passed->getContent());
    }

    public function test_a_post_with_a_trailing_slash_is_not_redirected(): void
    {
        $passed = new RedirectTrailingSlash()->handle(Request::create('/api/boxes/', 'POST'), static fn (): Response => new Response('doorgegeven'));

        self::assertSame(Response::HTTP_OK, $passed->getStatusCode());
        self::assertSame('doorgegeven', $passed->getContent());
    }
}
