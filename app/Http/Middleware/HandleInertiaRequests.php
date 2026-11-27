<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Integrations\Google\GoogleLogin;
use App\Models\User;
use App\Modules\Accounts\Data\AuthUserData;
use App\Modules\Content\Data\SeoData;
use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Enums\PublicPage;
use App\Modules\Content\Support\LocalizedUrls;
use App\Modules\Content\Support\StructuredData;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Middleware;
use Override;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

final class HandleInertiaRequests extends Middleware
{
    /** Set by a logout: the next page gets the shared prop `clearLocalCopy` once and wipes the editions in the browser. */
    public const string CLEAR_LOCAL_COPY = 'clear_local_copy';

    public function __construct(private readonly StructuredData $structuredData)
    {
    }

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
            'name' => Config::string('app.name'),
            'locale' => App::getLocale(),
            'locales' => Locale::values(),
            'localizedUrls' => fn (): array => LocalizedUrls::forRequest($request),
            'pageUrls' => $this->pageUrls(...),
            'seo' => fn (): ?SeoData => $this->seo($request),
            'clearLocalCopy' => fn (): bool => $request->hasSession() && $request->session()->pull(self::CLEAR_LOCAL_COPY) === true,
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
     * Our own page for 403, 404, 419, 500 and 503 (B66). A 404 from a route binding comes before this middleware ran,
     * so the shared props of the header and footer are shared here (bug 43 of test round 3).
     */
    public function errorPage(Response $response, Throwable $exception, Request $request): Response
    {
        unset($exception);
        $status = $response->getStatusCode();

        if (
            ! in_array($status, [403, 404, 419, 500, 503], true)
            || $request->expectsJson()
            || ! $request->route() instanceof Route
        ) {
            return $response;
        }

        Inertia::share($this->share($request));

        return Inertia::render('error', ['status' => $status])->toResponse($request)->setStatusCode($status);
    }

    /**
     * Paths of the public pages in the current language, keyed in camelCase
     * (printGuide, privacy). The slugs differ per language, so links use these.
     *
     * @return array<string, string>
     */
    private function pageUrls(): array
    {
        $locale = Locale::from(App::getLocale());
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

        $locale = Locale::from(App::getLocale());

        return SeoData::forPage($publicPage, $locale, $this->structuredData->forPage($publicPage, $locale));
    }
}
