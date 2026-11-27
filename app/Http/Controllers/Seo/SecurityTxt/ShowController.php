<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seo\SecurityTxt;

use App\Modules\Content\Enums\PublicPage;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Config;

/**
 * /.well-known/security.txt (RFC 9116). Expires is rolled forward on every
 * request so the file never goes stale.
 */
final readonly class ShowController
{
    public function __invoke(): Response
    {
        $lines = [
            'Contact: mailto:' . Config::string('printopoly.contact_email'),
            'Expires: ' . now()->addYear()->startOfDay()->utc()->format('Y-m-d\TH:i:s\Z'),
            'Preferred-Languages: nl, en',
            'Canonical: ' . PublicPage::origin() . '/.well-known/security.txt',
        ];

        return response(implode("\n", $lines) . "\n", 200, ['Content-Type' => 'text/plain; charset=utf-8']);
    }
}
