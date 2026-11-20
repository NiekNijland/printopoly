<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seo;

use App\Enums\PublicPage;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * robots.txt. It is a route rather than a file so the sitemap line follows
 * APP_URL. The editor and the editions are private and not worth indexing.
 */
final class ShowRobotsController extends Controller
{
    public function __invoke(): Response
    {
        $lines = [
            'User-agent: *',
            'Disallow: /*/editor',
            'Disallow: /*/editions',
            'Disallow: /auth/',
            '',
            'Sitemap: ' . PublicPage::origin() . '/sitemap.xml',
        ];

        return response(implode("\n", $lines) . "\n", 200, ['Content-Type' => 'text/plain; charset=utf-8']);
    }
}
