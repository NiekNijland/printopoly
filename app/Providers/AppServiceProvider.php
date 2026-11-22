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
        // Friends adding to a box (B123): a few per minute from one address, and a ceiling per link for the whole group.
        RateLimiter::for('box-contribute', static fn (Request $request): array => [
            Limit::perMinute(8)->by('box:' . $request->route('token') . ':' . $request->ip()),
            Limit::perHour(60)->by('box-hour:' . $request->route('token') . ':' . $request->ip()),
            Limit::perHour(400)->by('box-total:' . $request->route('token')),
        ]);
        // The owner's editor asks for its box every few seconds.
        RateLimiter::for('box-owner', static fn (Request $request): Limit => Limit::perMinute(120)->by('box-owner:' . $request->ip()));
        // Uploading an edition for a print job without an account (§2.1 of test round 3): a school or a family on one
        // address prints at the same time, so 20 a minute, and at most 120 an hour.
        RateLimiter::for('print-upload', static fn (Request $request): array => [
            Limit::perMinute(20)->by('print-upload:' . $request->ip()),
            Limit::perHour(120)->by('print-upload-hour:' . $request->ip()),
        ]);
        // Every picture for the group app is a Chrome run on the queue (B174); asking for the result is cheap and has its own limit.
        // The feature counter (B206): enough for a busy page, too little to skew the numbers.
        RateLimiter::for('feature-count', static fn (Request $request): Limit => Limit::perMinute(60)->by('feature-count:' . $request->ip()));
        RateLimiter::for('share-image', static fn (Request $request): Limit => Limit::perMinute(6)->by('share-image:' . $request->ip()));
        RateLimiter::for('share-image-poll', static fn (Request $request): Limit => Limit::perMinute(120)->by('share-image-poll:' . $request->ip()));
        RateLimiter::for('account-delete', static fn (Request $request): Limit => Limit::perHour(5)->by($key($request)));
    }
}
