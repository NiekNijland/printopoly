<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Data\AuthUserData;
use App\Enums\Locale;
use App\Models\User;
use App\Support\GoogleLogin;
use App\Support\LocalizedUrls;
use Illuminate\Http\Request;
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
            'auth' => [
                'user' => function () use ($request): ?AuthUserData {
                    $user = $request->user();

                    return $user instanceof User ? AuthUserData::fromUser($user) : null;
                },
                'googleLoginEnabled' => GoogleLogin::isConfigured(),
            ],
        ];
    }
}
