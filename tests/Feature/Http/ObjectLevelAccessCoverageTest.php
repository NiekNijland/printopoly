<?php

declare(strict_types=1);

namespace Tests\Feature\Http;

use App\Models\Asset;
use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Models\Edition;
use App\Models\PrintJob;
use App\Models\User;
use BackedEnum;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Routing\Route;
use Illuminate\Routing\Router;
use Illuminate\Support\Str;
use ReflectionNamedType;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Feature\AppRoutes;
use Tests\Support\UniqueValue;
use Tests\TestCase;

/**
 * Every entry point that takes a record refuses someone else's record (catalog "Object-level access"): the test asks the
 * router for its routes, takes each parameter that names a record (a parameter the controller binds to a model, or an id
 * or token by its name), builds that record for another user from the map below, calls the route as an intruder and
 * expects 403 or 404. A capability parameter (the secret of a link, TokenCapability) is filled with a secret that opens
 * nothing for the intruder: the id of the owner's box without its owner secret, the link of a box that expired, a receipt
 * of another box, an id of a picture that was never asked for. A record parameter without an entry in a map is a gap.
 * Blind spot, named in the guide: a value parameter filled with a value the route's pattern refuses answers 404 from the
 * router, before the check.
 */
final class ObjectLevelAccessCoverageTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_it_refuses_someone_elses_record_on_every_route_that_takes_one_or_holds_the_gap_in_its_counted_list(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $records = $this->records();
        $capabilities = $this->capabilities();
        $gaps = [];
        $served = [];

        foreach ($this->routes()->all() as $route) {
            $parameters = AppRoutes::parameters($route);
            $recordParameters = array_filter($parameters, $this->isRecord(...), ARRAY_FILTER_USE_BOTH);

            if ($recordParameters === []) {
                continue;
            }

            $missing = array_keys(array_filter($recordParameters, static fn (?string $model, string $name): bool => $model === null ? ! isset($capabilities[$name]) : ! isset($records[$model]), ARRAY_FILTER_USE_BOTH));

            if ($missing !== []) {
                $gaps[] = AppRoutes::identifier($route) . ': no refusal test for {' . implode('}, {', $missing) . '}';

                continue;
            }

            $status = $this->actingAs($intruder)->call($route->methods()[0], $this->url($route, $parameters, $records, $capabilities, $owner))->getStatusCode();

            if (! in_array($status, [403, 404], true)) {
                $served[] = AppRoutes::identifier($route) . " served someone else's record with " . $status;
            }
        }

        self::assertSame([], $served);
        self::assertSame([], $gaps);
    }

    /**
     * @param class-string<Model>|null $model
     */
    private function isRecord(?string $model, string $name): bool
    {
        return $model !== null || preg_match('/^(token|receipt|id)$|Id$/', $name) === 1;
    }

    /**
     * @param array<string, class-string<Model>|null> $parameters
     * @param array<class-string<Model>, Closure(User): string> $records
     * @param array<string, Closure(User): string> $capabilities
     */
    private function url(Route $route, array $parameters, array $records, array $capabilities, User $owner): string
    {
        $values = [];

        foreach ($parameters as $name => $model) {
            $values[$name] = match (true) {
                $model !== null => $records[$model]($owner),
                isset($capabilities[$name]) => $capabilities[$name]($owner),
                default => $this->value($route, $name),
            };
        }

        return '/' . ltrim((string) preg_replace_callback('/\{(\w+)\??\}/', static fn (array $match): string => rawurlencode($values[$match[1]] ?? ''), $route->uri()), '/');
    }

    private function value(Route $route, string $name): string
    {
        foreach (AppRoutes::signature($route) as $parameter) {
            $type = $parameter->getType();

            if ($parameter->getName() === $name && $type instanceof ReflectionNamedType && is_subclass_of($type->getName(), BackedEnum::class)) {
                $first = $type->getName()::cases()[0] ?? null;

                return $first instanceof BackedEnum ? (string) $first->value : 'x';
            }
        }

        return $name === 'locale' ? 'nl' : 'x';
    }

    /**
     * @return array<class-string<Model>, Closure(User): string> per model: a record of the given owner, as the URL names it
     */
    private function records(): array
    {
        return [
            Edition::class => static fn (User $owner): string => Edition::factory()->createOne(['user_id' => $owner->publicId()])->edition_id,
            PrintJob::class => static fn (User $owner): string => PrintJob::factory()->createOne(['user_id' => $owner->publicId()])->publicId(),
            Asset::class => static fn (User $owner): string => Asset::factory()->createOne(['user_id' => $owner->publicId()])->publicId(),
        ];
    }

    /**
     * @return array<string, Closure(User): string> per capability parameter: a secret of the owner's that opens nothing for the intruder
     */
    private function capabilities(): array
    {
        $box = static fn (User $owner, array $attributes = []): CollectionBox => CollectionBox::factory()->createOne(['user_id' => $owner->publicId(), 'token' => UniqueValue::token(40), ...$attributes]);

        return [
            'boxId' => static fn (User $owner): string => $box($owner)->publicId(),
            'contributionId' => static fn (User $owner): string => BoxContribution::factory()->createOne(['box_id' => $box($owner)->publicId()])->publicId(),
            'token' => static fn (User $owner): string => $box($owner, ['expires_at' => now()->subDay()])->token,
            'receipt' => static fn (User $owner): string => BoxContribution::factory()->createOne(['box_id' => $box($owner)->publicId(), 'receipt' => UniqueValue::token(32)])->receipt,
            'id' => static fn (): string => Str::random(40),
        ];
    }

    private function routes(): AppRoutes
    {
        return new AppRoutes($this->app->make(Router::class), 'App\\', [base_path('routes'), base_path('bootstrap')]);
    }
}
