<?php

declare(strict_types=1);

namespace Tests\Feature\Providers;

use App\Models\Edition;
use App\Models\User;
use App\Providers\AppServiceProvider;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\ParallelTesting;
use Illuminate\Support\Facades\RateLimiter;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\OwnedEdition;
use Tests\TestCase;

final class AppServiceProviderTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_lazy_loading_is_prevented(): void
    {
        self::assertTrue(Model::preventsLazyLoading());
    }

    public function test_silently_discarding_an_attribute_is_prevented(): void
    {
        self::assertTrue(Model::preventsSilentlyDiscardingAttributes());
    }

    public function test_a_missing_attribute_reads_as_null_by_decision_q06(): void
    {
        self::assertFalse(Model::preventsAccessingMissingAttributes());
    }

    public function test_relations_are_never_loaded_automatically(): void
    {
        self::assertFalse(Model::isAutomaticallyEagerLoadingRelationships());
    }

    public function test_the_framework_hands_out_immutable_dates(): void
    {
        self::assertInstanceOf(CarbonImmutable::class, now());
    }

    public function test_a_test_run_has_the_strict_model_record_of_its_worker(): void
    {
        $token = ParallelTesting::token();

        self::assertFileExists(storage_path('logs/model-strictness-' . ($token === false ? '0' : $token) . '.log'));
    }

    public function test_production_generates_https_urls(): void
    {
        $this->bootInProduction();

        self::assertStringStartsWith('https://', url('/nl'));
    }

    public function test_production_reports_a_lazy_load_of_a_stored_model_and_loads_the_relation(): void
    {
        Exceptions::fake([LazyLoadingViolationException::class]);
        $this->bootInProduction();
        $owner = User::factory()->create();
        Edition::factory()->count(2)->create(['user_id' => $owner->getKey()]);

        $loaded = OwnedEdition::query()->get()->firstOrFail()->getRelationValue('owner');

        self::assertInstanceOf(User::class, $loaded);
        self::assertTrue($owner->is($loaded));
        Exceptions::assertReported(static fn (LazyLoadingViolationException $exception): bool => $exception->relation === 'owner');
    }

    public function test_production_passes_over_a_lazy_load_of_a_model_this_request_stored(): void
    {
        Exceptions::fake([LazyLoadingViolationException::class]);
        $this->bootInProduction();
        Edition::factory()->count(2)->create();
        $edition = OwnedEdition::query()->get()->firstOrFail();
        $edition->wasRecentlyCreated = true;

        self::assertNull($edition->getRelationValue('owner'));
        Exceptions::assertNothingReported();
    }

    public function test_production_reports_a_discarded_attribute_and_goes_on(): void
    {
        Exceptions::fake([MassAssignmentException::class]);
        $this->bootInProduction();

        $edition = new Edition()->fill(['name' => 'Kerst', 'not_a_field' => true]);

        self::assertSame('Kerst', $edition->getAttribute('name'));
        self::assertTrue(Model::preventsLazyLoading());
        self::assertTrue(Model::preventsSilentlyDiscardingAttributes());
        Exceptions::assertReported(static fn (MassAssignmentException $exception): bool => str_contains($exception->getMessage(), 'not_a_field'));
    }

    /**
     * @param list<string> $keys the config keys of the limits, in the order the limiter returns them
     */
    #[DataProvider('limiters')]
    public function test_a_limiter_takes_its_numbers_from_config(string $name, array $keys): void
    {
        config(array_combine(array_map(static fn (string $key): string => 'printopoly.rate_limits.' . $key, $keys), range(101, 100 + count($keys))));
        $limiter = RateLimiter::limiter($name);
        self::assertNotNull($limiter);

        $limits = Arr::wrap($limiter(Request::create('/api/box/' . str_repeat('a', 40) . '/contributions', 'POST')));

        self::assertSame(range(101, 100 + count($keys)), array_map(static fn (mixed $limit): int => $limit instanceof Limit ? $limit->maxAttempts : 0, $limits));
    }

    /**
     * @return iterable<string, array{string, list<string>}>
     */
    public static function limiters(): iterable
    {
        foreach (['pages', 'print-files', 'print-render', 'print-ready', 'print-photos', 'print-generate', 'print-choices', 'editions', 'editions-create', 'edition-assets', 'sign-in', 'sign-out', 'box-create', 'box-mine', 'box-mine-photo', 'box-owner', 'feature-count', 'share-image', 'share-image-poll'] as $name) {
            yield $name => [$name, [str_replace('-', '_', $name) . '_per_minute']];
        }

        yield 'account-delete' => ['account-delete', ['account_delete_per_hour']];
        yield 'box-contribute' => ['box-contribute', ['box_contribute_per_minute', 'box_contribute_per_hour', 'box_contribute_per_link_per_hour']];
        yield 'print-upload' => ['print-upload', ['print_upload_per_minute', 'print_upload_per_hour']];
    }

    public function test_a_route_answers_429_past_its_limit(): void
    {
        config(['printopoly.rate_limits.pages_per_minute' => 1]);

        $this->get('/sitemap.xml')->assertOk();
        $this->get('/sitemap.xml')->assertTooManyRequests();
    }

    private function bootInProduction(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'production');
        new AppServiceProvider($this->app)->boot();
    }
}
