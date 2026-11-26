<?php

declare(strict_types=1);

namespace App\Providers;

use App\Integrations\Chrome\PatientChromeDriver;
use App\Integrations\Google\GoogleLogin;
use App\Integrations\Ssr\ReleaseCheckedSsrGateway;
use App\Models\User;
use App\Modules\Accounts\Enums\Permission;
use App\Modules\Editions\Support\StandardEdition;
use App\Support\StrictModelRecorder;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Auth\Access\Response;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\ParallelTesting;
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
        // A busy page (the money of three sets) may answer the ready check later than chrome-php's 5 seconds.
        $this->app->extend('laravel-pdf.driver.chrome', static fn (): PatientChromeDriver => new PatientChromeDriver(config()->array('laravel-pdf.chrome', [])));
        $this->app->bind(Gateway::class, ReleaseCheckedSsrGateway::class);
    }

    public function boot(): void
    {
        Date::use(CarbonImmutable::class);

        // Two of the three checks of the strict models, in every environment, recorded and never thrown (Q-06). Not
        // shouldBeStrict(): a MongoDB document may lack a field that a newer schema added, which must read as null.
        $token = ParallelTesting::token();
        $recorder = new StrictModelRecorder($this->app->runningUnitTests() ? storage_path('logs/model-strictness-' . ($token === false ? '0' : $token) . '.log') : null);
        $recorder->start();
        Model::preventLazyLoading();
        Model::preventSilentlyDiscardingAttributes();
        Model::preventAccessingMissingAttributes(false);
        Model::handleLazyLoadingViolationUsing(static function (Model $model, string $relation, LazyLoadingViolationException $exception) use ($recorder): void {
            if ($model->exists && ! $model->wasRecentlyCreated) {
                $recorder->record($exception, [$model::class . ' lazy-loading ' . $relation]);
            }
        });
        Model::handleDiscardedAttributeViolationUsing(static function (Model $model, array $attributes, MassAssignmentException $exception) use ($recorder): void {
            $recorder->record($exception, array_map(static fn (string $attribute): string => $model::class . ' discarded-attribute ' . $attribute, array_values(array_filter($attributes, is_string(...)))));
        });

        if ($this->app->isProduction()) {
            URL::forceHttps();
        }

        // No Vite::prefetch(): it loads every page chunk (heic-to, the editor) on every page.
        $this->configureRateLimiting();
        $this->configurePermissions();
    }

    private function configurePermissions(): void
    {
        Gate::define(Permission::KEEP_EDITIONS->value, static fn (User $user): bool => true);
        Gate::define(Permission::MANAGE_ACCOUNT->value, static fn (User $user): bool => true);
        Gate::define(Permission::SIGN_IN_WITH_GOOGLE->value, static fn (?User $user): Response => GoogleLogin::isConfigured() ? Response::allow() : Response::denyAsNotFound());
    }

    /**
     * The editions API is limited per account. Autosave is debounced, so its limit is far above real use. Creating editions
     * (new, import, duplicate) has its own, much lower limit, and deleting an account is slower still. Every number is in
     * config/printopoly.php; every route takes one of these by name.
     */
    private function configureRateLimiting(): void
    {
        $key = static function (Request $request): string {
            $user = $request->user();

            return $user instanceof User ? $user->publicId() : (string) $request->ip();
        };
        $perMinute = static fn (string $name): Limit => Limit::perMinute(Config::integer('printopoly.rate_limits.' . $name . '_per_minute'));
        $byKey = static fn (string $name): Closure => static fn (Request $request): Limit => $perMinute($name)->by($name . ':' . $key($request));

        // Pages, the print files of a job and the files Chrome fetches while it renders a job (B54).
        RateLimiter::for('pages', $byKey('pages'));
        RateLimiter::for('print-files', $byKey('print_files'));
        RateLimiter::for('print-render', $byKey('print_render'));
        RateLimiter::for('print-ready', $byKey('print_ready'));
        RateLimiter::for('print-photos', $byKey('print_photos'));
        RateLimiter::for('print-generate', $byKey('print_generate'));
        RateLimiter::for('print-choices', $byKey('print_choices'));
        RateLimiter::for('editions', static fn (Request $request): Limit => $perMinute('editions')->by($key($request)));
        RateLimiter::for('editions-create', static fn (Request $request): Limit => $perMinute('editions_create')->by($key($request)));
        RateLimiter::for('edition-assets', $byKey('edition_assets'));
        RateLimiter::for('account-delete', static fn (Request $request): Limit => Limit::perHour(Config::integer('printopoly.rate_limits.account_delete_per_hour'))->by($key($request)));
        RateLimiter::for('sign-in', $byKey('sign_in'));
        RateLimiter::for('sign-out', $byKey('sign_out'));
        RateLimiter::for('box-create', $byKey('box_create'));
        // Friends adding to a box (B123): a few per minute from one address, and a ceiling per link for the whole group.
        RateLimiter::for('box-contribute', static fn (Request $request): array => [
            $perMinute('box_contribute')->by('box:' . self::routeText($request, 'token') . ':' . $request->ip()),
            Limit::perHour(Config::integer('printopoly.rate_limits.box_contribute_per_hour'))->by('box-hour:' . self::routeText($request, 'token') . ':' . $request->ip()),
            Limit::perHour(Config::integer('printopoly.rate_limits.box_contribute_per_link_per_hour'))->by('box-total:' . self::routeText($request, 'token')),
        ]);
        RateLimiter::for('box-mine', $byKey('box_mine'));
        RateLimiter::for('box-mine-photo', $byKey('box_mine_photo'));
        // The owner's editor asks for its box every few seconds.
        RateLimiter::for('box-owner', static fn (Request $request): Limit => $perMinute('box_owner')->by('box-owner:' . $request->ip()));
        // Uploading an edition for a print job without an account (§2.1 of test round 3): a school or a family on one
        // address prints at the same time, so a limit per minute and one per hour.
        RateLimiter::for('print-upload', static fn (Request $request): array => [
            $perMinute('print_upload')->by('print-upload:' . $request->ip()),
            Limit::perHour(Config::integer('printopoly.rate_limits.print_upload_per_hour'))->by('print-upload-hour:' . $request->ip()),
        ]);
        // Every picture for the group app is a Chrome run on the queue (B174); asking for the result is cheap and has its own limit.
        // The feature counter (B206): enough for a busy page, too little to skew the numbers.
        RateLimiter::for('feature-count', static fn (Request $request): Limit => $perMinute('feature_count')->by('feature-count:' . $request->ip()));
        RateLimiter::for('share-image', static fn (Request $request): Limit => $perMinute('share_image')->by('share-image:' . $request->ip()));
        RateLimiter::for('share-image-poll', static fn (Request $request): Limit => $perMinute('share_image_poll')->by('share-image-poll:' . $request->ip()));
    }

    private static function routeText(Request $request, string $parameter): string
    {
        $value = $request->route($parameter);

        return is_string($value) ? $value : '';
    }
}
