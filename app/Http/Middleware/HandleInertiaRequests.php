<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Data\AuthUserData;
use App\Integrations\Google\GoogleLogin;
use App\Models\User;
use App\Modules\Content\Data\SeoData;
use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use App\Modules\Content\Support\LocalizedUrls;
use App\Modules\Content\Support\StructuredData;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Middleware;
use Override;

class HandleInertiaRequests extends Middleware
{
    /**
     * Only public pages are server-rendered. The editor and the editions
     * measure the DOM and are private, so SSR adds nothing there (B66).
     *
     * @var array<int, string>
     */
    #[Override]
    protected $withoutSsr = [
        'nl/editor',
        'nl/editor/*',
        'en/editor',
        'en/editor/*',
        'nl/editions',
        'nl/editions/*',
        'en/editions',
        'en/editions/*',
        'nl/print',
        'nl/print/*',
        'en/print',
        'en/print/*',
    ];

    /** @var string */
    #[Override]
    protected $rootView = 'app';

    /**
     * @return array<string, mixed>
     */
    #[Override]
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'locale' => app()->getLocale(),
            'locales' => Locale::values(),
            'localizedUrls' => fn (): array => LocalizedUrls::forRequest($request),
            'pageUrls' => $this->pageUrls(...),
            'seo' => fn (): ?SeoData => $this->seo($request),
            'auth' => [
                'user' => function () use ($request): ?AuthUserData {
                    $user = $request->user();

                    return $user instanceof User ? AuthUserData::fromUser($user) : null;
                },
                'googleLoginEnabled' => GoogleLogin::isConfigured(),
            ],
        ];
    }

    /**
     * Paths of the public pages in the current language, keyed in camelCase
     * (printGuide, privacy). The slugs differ per language, so links use these.
     *
     * @return array<string, string>
     */
    private function pageUrls(): array
    {
        $locale = Locale::from(app()->getLocale());
        $urls = [];

        foreach (PublicPage::withSlug() as $page) {
            $urls[Str::camel($page->value)] = $page->path($locale);
        }

        return $urls;
    }

    /**
     * Canonical, hreflang and Open Graph data. Only the indexable public
     * pages have it; the editor and the editions do not.
     */
    private function seo(Request $request): ?SeoData
    {
        $page = $request->route('page');

        if (! is_string($page)) {
            return null;
        }

        $publicPage = PublicPage::tryFrom($page);

        if (! $publicPage instanceof PublicPage) {
            return null;
        }

        $locale = Locale::from(app()->getLocale());

        return SeoData::forPage($publicPage, $locale, resolve(StructuredData::class)->forPage($publicPage, $locale));
    }
}
