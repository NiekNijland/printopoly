<?php

declare(strict_types=1);

namespace App\Providers;

use App\Game\StandardEdition;
use App\Models\User;
use App\Print\ChromePdfRenderer;
use App\Print\PdfRenderer;
use App\Support\ReleaseCheckedSsrGateway;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Inertia\Ssr\Gateway;
use Override;

class AppServiceProvider extends ServiceProvider
{
    #[Override]
    public function register(): void
    {
        $this->app->singleton(StandardEdition::class, static fn (): StandardEdition => StandardEdition::load());
        $this->app->bind(PdfRenderer::class, ChromePdfRenderer::class);
        $this->app->singleton(ReleaseCheckedSsrGateway::class);
        $this->app->bind(Gateway::class, ReleaseCheckedSsrGateway::class);
    }

    public function boot(): void
    {
        Date::use(CarbonImmutable::class);
        // Not shouldBeStrict(): a MongoDB document may lack a field that a
        // newer schema added, which must read as null rather than throw.
        Model::preventLazyLoading(! $this->app->isProduction());
        Model::preventSilentlyDiscardingAttributes(! $this->app->isProduction());

        if ($this->app->isProduction()) {
            URL::forceHttps();
        }

        // No Vite::prefetch(): it loads every page chunk (heic-to, the editor) on every page.
        $this->configureRateLimiting();
    }

    /**
     * The editions API is limited per account. Autosave is debounced, so 300
     * requests a minute is far above real use. Creating editions (new,
     * import, duplicate) has its own, much lower limit, and deleting an
     * account is slower still.
     */
    private function configureRateLimiting(): void
    {
        $key = static function (Request $request): string {
            $user = $request->user();

            return $user instanceof User ? $user->publicId() : (string) $request->ip();
        };

        RateLimiter::for('editions', static fn (Request $request): Limit => Limit::perMinute(300)->by($key($request)));
        RateLimiter::for('editions-create', static fn (Request $request): Limit => Limit::perMinute(20)->by($key($request)));
        RateLimiter::for('account-delete', static fn (Request $request): Limit => Limit::perHour(5)->by($key($request)));
    }
}
