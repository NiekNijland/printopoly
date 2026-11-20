<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| SEO
|--------------------------------------------------------------------------
|
| The date a public page's text last changed (B66). It becomes <lastmod> in
| the sitemap and dateModified in the structured data. Bump the date of a
| page when its text changes; a crawler that sees the date move without a
| change stops trusting it, so a deploy alone must not touch these.
|
*/

return [

    'lastmod' => [
        'home' => '2026-11-20',
        'print-guide' => '2026-11-20',
        'faq' => '2026-11-20',
        'privacy' => '2026-11-20',
        'terms' => '2026-11-20',
        'contact' => '2026-11-20',
    ],

    // The square logo that goes into the Organization data (512 x 512 PNG in public/).
    'logo' => '/icon-512.png',

    // The OG image is 1200 x 630 (public/og/og-{locale}.png).
    'og_image' => ['width' => 1200, 'height' => 630],

];
