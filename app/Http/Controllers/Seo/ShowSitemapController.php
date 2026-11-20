<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seo;

use App\Enums\Locale;
use App\Enums\PublicPage;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;

/**
 * sitemap.xml: every public page in every language, each with its hreflang
 * alternates (B66).
 */
final class ShowSitemapController extends Controller
{
    public function __invoke(): Response
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";

        foreach (PublicPage::cases() as $page) {
            foreach (Locale::cases() as $locale) {
                $xml .= "  <url>\n    <loc>" . $this->escape($page->absoluteUrl($locale)) . "</loc>\n";

                foreach (Locale::cases() as $alternate) {
                    $xml .= '    <xhtml:link rel="alternate" hreflang="' . $alternate->value . '" href="'
                        . $this->escape($page->absoluteUrl($alternate)) . "\"/>\n";
                }

                $xml .= '    <xhtml:link rel="alternate" hreflang="x-default" href="'
                    . $this->escape($page->absoluteUrl(Locale::default())) . "\"/>\n  </url>\n";
            }
        }

        return response($xml . "</urlset>\n", 200, ['Content-Type' => 'application/xml; charset=utf-8']);
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
