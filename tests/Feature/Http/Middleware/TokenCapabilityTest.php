<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Models\User;
use App\Modules\Boxes\Enums\BoxCapability;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\ShareImages;
use Closure;
use Illuminate\Routing\Route;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Feature\AppRoutes;
use Tests\TestCase;

final class TokenCapabilityTest extends TestCase
{
    use RefreshesMongoDatabase;

    private const array CAPABILITY_PARAMETERS = ['token' => BoxCapability::LINK, 'boxId' => BoxCapability::OWNER, 'id' => BoxCapability::SHARE_IMAGE];

    public function test_every_route_with_the_secret_of_a_link_carries_the_capability_of_that_secret(): void
    {
        $routes = $this->routes();
        $checked = 0;

        foreach ($routes->all() as $route) {
            foreach (array_intersect_key(self::CAPABILITY_PARAMETERS, array_flip($this->names($route))) as $capability) {
                self::assertContains('capability:' . $capability->value, $routes->namedMiddleware($route), AppRoutes::identifier($route));
                $checked++;
            }
        }

        self::assertSame(12, $checked);
    }

    public function test_a_held_secret_reaches_the_controller_on_every_capability_route(): void
    {
        foreach ($this->capabilityRoutes() as $route) {
            $world = $this->world();

            $status = $this->call($route->methods()[0], $this->url($route, $world), server: $this->transformHeadersToServerVars([BoxAccess::HEADER => $world['secret']]))->getStatusCode();

            self::assertNotSame(404, $status, AppRoutes::identifier($route));
        }
    }

    public function test_a_secret_that_opens_nothing_answers_404_on_every_capability_route(): void
    {
        foreach ($this->capabilityRoutes() as $route) {
            foreach ($this->closedSecrets() as $case => $closed) {
                if (str_starts_with($case, 'owner:') && ! in_array('boxId', $this->names($route), true)) {
                    continue;
                }

                $world = $this->world();
                [$overrides, $headers, $user] = $closed($world);
                $request = $user instanceof User ? $this->actingAs($user) : $this;

                $status = $request->call($route->methods()[0], $this->url($route, [...$world, ...$overrides]), server: $this->transformHeadersToServerVars($headers))->getStatusCode();

                self::assertSame(404, $status, AppRoutes::identifier($route) . ' with ' . $case);
            }
        }
    }

    public function test_a_held_secret_never_reaches_a_record_of_another_box(): void
    {
        $nested = 0;

        foreach ($this->capabilityRoutes() as $route) {
            $world = $this->world();
            $other = CollectionBox::factory()->createOne(['token' => Str::random(40)]);
            $foreign = $this->contribution($other);
            $overrides = array_intersect_key(['contributionId' => $foreign->publicId(), 'receipt' => $foreign->receipt], array_flip($this->names($route)));

            if ($overrides === []) {
                continue;
            }

            $status = $this->call($route->methods()[0], $this->url($route, [...$world, ...$overrides]), ['decision' => 'reject'], server: $this->transformHeadersToServerVars([BoxAccess::HEADER => $world['secret']]))->getStatusCode();

            self::assertSame(404, $status, AppRoutes::identifier($route));
            $nested++;
        }

        self::assertSame(3, $nested);
    }

    public function test_the_account_that_made_a_box_manages_it_without_the_secret(): void
    {
        $owner = User::factory()->createOne();
        $box = CollectionBox::factory()->createOne(['user_id' => $owner->publicId(), 'token' => Str::random(40)]);

        $this->actingAs($owner)->getJson('/api/boxes/' . $box->publicId())->assertOk();
        $this->actingAs(User::factory()->createOne())->getJson('/api/boxes/' . $box->publicId())->assertNotFound();
    }

    public function test_a_link_that_a_new_link_replaced_still_opens_the_page_that_says_so(): void
    {
        $box = CollectionBox::factory()->createOne(['token' => Str::random(40)]);
        $old = $box->token;
        $box->replaced_tokens = [CollectionBox::tokenHash($old)];
        $box->token = Str::random(40);
        $box->save();

        $this->get('/nl/box/' . $old)->assertOk();
        $this->postJson('/api/box/' . $old . '/contributions', ['elementKey' => 'space.01', 'firstName' => 'Kees', 'value' => 'Dorp'])->assertGone();
        $this->getJson('/api/box/' . $old . '/mine?' . http_build_query(['receipts' => [Str::random(32)]]))->assertNotFound();
    }

    /**
     * @return list<Route>
     */
    private function capabilityRoutes(): array
    {
        $routes = $this->routes();

        return array_values(array_filter($routes->all(), static fn (Route $route): bool => array_any($routes->namedMiddleware($route), static fn (string $name): bool => str_starts_with($name, 'capability:'))));
    }

    /**
     * @return array<string, Closure(array<string, string>): array{array<string, string>, array<string, string>, User|null}>
     */
    private function closedSecrets(): array
    {
        $expired = static fn (): CollectionBox => CollectionBox::factory()->createOne(['token' => Str::random(40), 'owner_hash' => BoxAccess::hash('expired'), 'expires_at' => now()->subMinute()]);

        return [
            'an unknown secret' => static fn (array $world): array => [['token' => Str::random(40), 'boxId' => '0123456789abcdef01234567', 'id' => Str::random(40)], [BoxAccess::HEADER => $world['secret']], null],
            'an expired box' => static fn (array $world): array => [['token' => $expired()->token, 'boxId' => $expired()->publicId(), 'id' => Str::random(40)], [BoxAccess::HEADER => 'expired'], null],
            'owner: no owner secret' => static fn (array $world): array => [[], [], null],
            'owner: a wrong owner secret' => static fn (array $world): array => [[], [BoxAccess::HEADER => $world['secret'] . 'x'], null],
            "owner: someone else's account" => static fn (array $world): array => [[], [], User::factory()->createOne()],
        ];
    }

    /**
     * @return array<string, string> the route values of one box with a contribution, its owner secret and a picture that was asked for
     */
    private function world(): array
    {
        Storage::fake('local');
        $secret = Str::random(48);
        $box = CollectionBox::factory()->createOne(['token' => Str::random(40), 'owner_hash' => BoxAccess::hash($secret)]);
        $contribution = $this->contribution($box);
        $id = Str::random(40);
        $this->app->make(ShareImages::class)->failed($id);

        return [
            'locale' => 'nl',
            'token' => $box->token,
            'boxId' => $box->publicId(),
            'contributionId' => $contribution->publicId(),
            'receipt' => $contribution->receipt,
            'id' => $id,
            'secret' => $secret,
        ];
    }

    private function contribution(CollectionBox $box): BoxContribution
    {
        $receipt = Str::random(32);
        Storage::disk('local')->put('boxes/' . $receipt . '.jpg', 'jpeg');

        return BoxContribution::factory()->createOne([
            'box_id' => $box->publicId(),
            'receipt' => $receipt,
            'disk' => 'local',
            'print_path' => 'boxes/' . $receipt . '.jpg',
            'preview_path' => 'boxes/' . $receipt . '.jpg',
        ]);
    }

    /**
     * @param array<string, string> $values
     */
    private function url(Route $route, array $values): string
    {
        return '/' . ltrim((string) preg_replace_callback('/\{(\w+)\??\}/', static fn (array $match): string => rawurlencode($values[$match[1]] ?? ''), $route->uri()), '/');
    }

    /**
     * @return list<string>
     */
    private function names(Route $route): array
    {
        return array_values(array_filter($route->parameterNames(), is_string(...)));
    }

    private function routes(): AppRoutes
    {
        return new AppRoutes($this->app->make(Router::class), 'App\\', [base_path('routes'), base_path('bootstrap')]);
    }
}
