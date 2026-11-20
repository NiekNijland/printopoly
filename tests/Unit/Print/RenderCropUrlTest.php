<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Print\PrintPartBuilder;
use Illuminate\Support\Facades\URL;
use PHPUnit\Framework\Attributes\Test;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Production forces https, while Chrome fetches the crops from the plain-http loopback server. The link
 * must keep the render origin's scheme and port, and keep the signature of the public address.
 */
final class RenderCropUrlTest extends TestCase
{
    #[Test]
    public function the_crop_link_uses_the_render_origin_even_when_https_is_forced(): void
    {
        URL::forceHttps();
        $signed = URL::temporarySignedRoute('print.render.crop', now()->addMinutes(5), ['printJob' => 'tok', 'folder' => 'printer-board', 'name' => 'a.jpg'], absolute: false);

        $method = new ReflectionMethod(PrintPartBuilder::class, 'renderUrl');
        $url = $method->invoke($this->app->make(PrintPartBuilder::class), $signed, 'http://printopoly.nl:8080');

        self::assertIsString($url);
        self::assertStringStartsWith('http://printopoly.nl:8080/print-render/tok/printer-board/a.jpg?', $url);
        self::assertStringContainsString('signature=', $url);
        self::assertSame(parse_url($signed, PHP_URL_QUERY), parse_url($url, PHP_URL_QUERY));
        self::assertStringStartsNotWith('https://', $url);
    }
}
