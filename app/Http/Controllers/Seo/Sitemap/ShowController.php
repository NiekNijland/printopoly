<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seo\Sitemap;

use App\Http\Controllers\Controller;
use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use Illuminate\Http\Response;

/**
 * sitemap.xml: every public page in every language, each with its hreflang
 * alternates and the date its text last changed (B66, config/seo.php). Only
 * indexable pages that answer 200 belong here; the editor, the editions and
 * the print pages are private.
 */
final class ShowController extends Controller
{
    public function __invoke(): Response
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";

        foreach (PublicPage::cases() as $page) {
            $modified = config('seo.lastmod.' . $page->value);

            foreach (Locale::cases() as $locale) {
                $xml .= "  <url>\n    <loc>" . $this->escape($page->absoluteUrl($locale)) . "</loc>\n";

                if (is_string($modified)) {
                    $xml .= '    <lastmod>' . $this->escape($modified) . "</lastmod>\n";
                }

                foreach (Locale::cases() as $alternate) {
                    $xml .= '    <xhtml:link rel="alternate" hreflang="' . $alternate->value . '" href="'
                        . $this->escape($page->absoluteUrl($alternate)) . "\"/>\n";
                }

                $xml .= '    <xhtml:link rel="alternate" hreflang="x-default" href="'
                    . $this->escape($page->absoluteUrl(Locale::default())) . "\"/>\n  </url>\n";
            }
        }

        return response($xml . "</urlset>\n", 200, [
            'Content-Type' => 'application/xml; charset=utf-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
