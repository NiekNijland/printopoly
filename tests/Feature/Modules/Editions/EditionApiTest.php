<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Events\EditionDeletedEvent;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class EditionApiTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_every_endpoint_needs_a_login(): void
    {
        $this->getJson('/api/editions')->assertUnauthorized();
        $this->postJson('/api/editions', Editions::payload())->assertUnauthorized();
        $this->postJson('/api/editions/import', ['editions' => [Editions::payload()]])->assertUnauthorized();
        $this->getJson('/api/editions/e1')->assertUnauthorized();
        $this->patchJson('/api/editions/e1', ['baseRevision' => 0, 'name' => 'x'])->assertUnauthorized();
        $this->putJson('/api/editions/e1', Editions::payload() + ['baseRevision' => 0])->assertUnauthorized();
        $this->patchJson('/api/editions/e1/name', ['baseRevision' => 0, 'name' => 'x'])->assertUnauthorized();
        $this->postJson('/api/editions/e1/duplicate')->assertUnauthorized();
        $this->deleteJson('/api/editions/e1')->assertUnauthorized();
    }

    public function test_it_lists_only_my_editions_newest_change_first(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'old', ['updatedAt' => 1_000, 'name' => 'Old']);
        Editions::store($user, 'new', ['updatedAt' => 5_000, 'name' => 'New']);
        Editions::store(User::factory()->create(), 'theirs');

        $this->actingAs($user)
            ->getJson('/api/editions')
            ->assertOk()
            ->assertJsonCount(2, 'editions')
            ->assertJsonPath('editions.0.id', 'new')
            ->assertJsonPath('editions.0.name', 'New')
            ->assertJsonPath('editions.0.revision', 0)
            ->assertJsonPath('editions.1.id', 'old')
            ->assertJsonPath('limit', 20);
    }

    public function test_it_creates_an_edition_with_the_id_and_revision_of_the_browser(): void
    {
        $user = User::factory()->create();

        $payload = Editions::payload('local-1', [
            'revision' => 7,
            'createdAt' => 1_111,
            'updatedAt' => 2_222,
            'elements' => ['space.01' => ['name' => 'Stadspark']],
        ]);

        $this->actingAs($user)
            ->postJson('/api/editions', $payload)
            ->assertCreated()
            ->assertJsonPath('edition.id', 'local-1')
            ->assertJsonPath('edition.revision', 7)
            ->assertJsonPath('edition.createdAt', 1_111)
            ->assertJsonPath('edition.elements', ['space.01' => ['name' => 'Stadspark']]);

        $stored = Edition::query()->where('edition_id', 'local-1')->firstOrFail();
        self::assertSame($user->publicId(), $stored->user_id);
        self::assertSame('Stadspark', $stored->elements['space.01']['name'] ?? null);
    }

    public function test_an_empty_edition_returns_elements_as_an_object(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/editions', Editions::payload());

        $content = (string) $this->actingAs($user)->getJson('/api/editions/e1')->assertOk()->getContent();

        self::assertStringContainsString('"elements":{}', $content);
    }

    public function test_it_rejects_an_invalid_edition(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('bad id!', [
                'theme' => 'neon',
                'elements' => ['space.99' => ['name' => 'x']],
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('edition');

        self::assertSame(0, Edition::query()->count());
    }

    public function test_it_never_replaces_an_existing_edition_on_create(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1', ['name' => 'Server version', 'revision' => 3]);

        $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('e1', ['name' => 'Local version']))
            ->assertConflict()
            ->assertJsonPath('code', 'conflict')
            ->assertJsonPath('current.name', 'Server version')
            ->assertJsonPath('current.revision', 3);

        self::assertSame('Server version', Edition::query()->where('edition_id', 'e1')->firstOrFail()->name);
    }

    public function test_an_account_holds_twenty_editions(): void
    {
        $user = User::factory()->create();

        for ($i = 1; $i <= 20; $i++) {
            Editions::store($user, "e{$i}");
        }

        $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('one-too-many'))
            ->assertUnprocessable()
            ->assertJsonPath('code', 'edition_limit')
            ->assertJsonPath('limit', 20);

        self::assertSame(20, Edition::query()->where('user_id', $user->publicId())->count());
    }

    public function test_the_limit_comes_from_the_config(): void
    {
        $user = User::factory()->create();

        config(['printopoly.limits.editions_per_account' => 1]);
        Editions::store($user, 'e1');

        $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('e2'))
            ->assertUnprocessable()
            ->assertJsonPath('limit', 1);
    }

    public function test_the_limit_is_per_account(): void
    {
        $user = User::factory()->create();

        config(['printopoly.limits.editions_per_account' => 1]);
        Editions::store(User::factory()->create(), 'theirs');

        $this->actingAs($user)->postJson('/api/editions', Editions::payload('mine'))->assertCreated();
    }

    public function test_it_shows_an_edition(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1', ['name' => 'Mine']);

        $this->actingAs($user)
            ->getJson('/api/editions/e1')
            ->assertOk()
            ->assertJsonPath('edition.name', 'Mine')
            ->assertJsonPath('edition.boardProfile.panels', 4)
            ->assertJsonPath('edition.schemaVersion', 1);
    }

    public function test_an_unknown_edition_is_not_found(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/editions/nope')->assertNotFound();
    }

    public function test_it_deletes_an_edition(): void
    {
        $user = User::factory()->create();

        Event::fake([EditionDeletedEvent::class]);
        Editions::store($user, 'e1');
        Editions::store($user, 'e2');

        $this->actingAs($user)->deleteJson('/api/editions/e1')->assertNoContent();

        self::assertSame(['e2'], Edition::query()->pluck('edition_id')->all());
        Event::assertDispatched(EditionDeletedEvent::class, fn (EditionDeletedEvent $event): bool => $event->editionId === 'e1' && $event->userId === $user->publicId());
        $this->actingAs($user)->getJson('/api/editions/e1')->assertNotFound();
    }

    public function test_the_api_is_rate_limited_per_account(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 300; $i++) {
            $this->actingAs($user)->getJson('/api/editions')->assertOk();
        }

        $this->actingAs($user)->getJson('/api/editions')->assertTooManyRequests();
        $this->actingAs(User::factory()->create())->getJson('/api/editions')->assertOk();
    }

    public function test_creating_editions_has_a_lower_limit(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 20; $i++) {
            $this->actingAs($user)->postJson('/api/editions', ['nonsense' => true])->assertUnprocessable();
        }

        $this->actingAs($user)->postJson('/api/editions', ['nonsense' => true])->assertTooManyRequests();
        $this->actingAs($user)->getJson('/api/editions')->assertOk();
    }
}
