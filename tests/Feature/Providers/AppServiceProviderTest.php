<?php

declare(strict_types=1);

namespace Tests\Feature\Providers;

use App\Models\Edition;
use App\Models\User;
use App\Providers\AppServiceProvider;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\ParallelTesting;
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

    private function bootInProduction(): void
    {
        $this->app->detectEnvironment(static fn (): string => 'production');
        new AppServiceProvider($this->app)->boot();
    }
}
