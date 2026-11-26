<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Events\EditionDuplicatedEvent;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class EditionDuplicateApiTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_it_duplicates_an_edition_as_a_new_one(): void
    {
        $user = User::factory()->create();

        Event::fake([EditionDuplicatedEvent::class]);
        Editions::store($user, 'e1', [
            'revision' => 9,
            'name' => 'Zaterdagclub',
            'elements' => ['space.01' => ['name' => 'Stadspark']],
        ]);

        $response = $this->actingAs($user)
            ->postJson('/api/editions/e1/duplicate')
            ->assertCreated()
            ->assertJsonPath('edition.name', 'Zaterdagclub (kopie)')
            ->assertJsonPath('edition.revision', 0)
            ->assertJsonPath('edition.elements', ['space.01' => ['name' => 'Stadspark']]);

        $copyId = $response->json('edition.id');
        self::assertIsString($copyId);
        self::assertNotSame('e1', $copyId);
        self::assertSame(2, Edition::query()->where('user_id', $user->publicId())->count());
        Event::assertDispatched(EditionDuplicatedEvent::class, fn (EditionDuplicatedEvent $event): bool => $event->sourceId === 'e1' && $event->copyId === $copyId);
    }

    public function test_a_copy_of_an_english_edition_says_copy_and_can_be_named(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1', ['language' => 'en', 'name' => 'Club']);

        $this->actingAs($user)->postJson('/api/editions/e1/duplicate')
            ->assertJsonPath('edition.name', 'Club (copy)');
        $this->actingAs($user)->postJson('/api/editions/e1/duplicate', ['name' => 'Eigen naam'])
            ->assertJsonPath('edition.name', 'Eigen naam');
    }

    public function test_a_duplicate_respects_the_limit(): void
    {
        $user = User::factory()->create();

        config(['printopoly.limits.editions_per_account' => 1]);
        Editions::store($user, 'e1');

        $this->actingAs($user)->postJson('/api/editions/e1/duplicate')
            ->assertUnprocessable()
            ->assertJsonPath('code', 'edition_limit');
    }
}
