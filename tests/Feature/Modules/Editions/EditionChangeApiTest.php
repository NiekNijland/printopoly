<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions;

use App\Models\Edition;
use App\Models\User;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class EditionChangeApiTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_patch_changes_only_the_named_elements_and_bumps_the_revision(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1', [
            'elements' => [
                'space.01' => ['name' => 'Stadspark'],
                'space.03' => ['name' => 'Havenstraat'],
            ],
        ]);

        $this->actingAs($user)
            ->patchJson('/api/editions/e1', [
                'baseRevision' => 0,
                'theme' => 'riso',
                'elements' => [
                    'space.01' => ['name' => 'Stadspark Noord'],
                    'space.03' => null,
                    'card.chance.07' => ['text' => 'Ga naar de kroeg', 'amount' => 55],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('revision', 1);

        $stored = Edition::query()->where('edition_id', 'e1')->firstOrFail();
        self::assertSame(1, $stored->revision);
        self::assertSame('riso', $stored->theme);
        self::assertSame('nl', $stored->language);
        self::assertSame('Stadspark Noord', $stored->elements['space.01']['name'] ?? null);
        self::assertArrayNotHasKey('space.03', $stored->elements);
        self::assertSame(55, $stored->elements['card.chance.07']['amount'] ?? null);
        self::assertGreaterThan(1_000, $stored->updated_at_ms);
    }

    public function test_a_patch_on_an_old_revision_conflicts_and_changes_nothing(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1', ['revision' => 4, 'name' => 'Server version']);

        $this->actingAs($user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 3, 'name' => 'Stale window'])
            ->assertConflict()
            ->assertJsonPath('code', 'conflict')
            ->assertJsonPath('current.name', 'Server version')
            ->assertJsonPath('current.revision', 4);

        $stored = Edition::query()->where('edition_id', 'e1')->firstOrFail();
        self::assertSame('Server version', $stored->name);
        self::assertSame(4, $stored->revision);
    }

    public function test_two_patches_on_the_same_revision_cannot_both_win(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1');

        $this->actingAs($user)->patchJson('/api/editions/e1', ['baseRevision' => 0, 'name' => 'First'])->assertOk();
        $this->actingAs($user)->patchJson('/api/editions/e1', ['baseRevision' => 0, 'name' => 'Second'])->assertConflict();

        self::assertSame('First', Edition::query()->where('edition_id', 'e1')->firstOrFail()->name);
    }

    public function test_a_patch_with_a_bad_element_is_rejected(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1');

        $this->actingAs($user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 0, 'elements' => ['space.01' => ['amount' => 5]]])
            ->assertUnprocessable();
        $this->actingAs($user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 0, 'elements' => ['nonsense' => null]])
            ->assertUnprocessable();
        $this->actingAs($user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 0])
            ->assertUnprocessable();
        $this->actingAs($user)
            ->patchJson('/api/editions/e1', ['name' => 'No base revision'])
            ->assertUnprocessable();

        self::assertSame(0, Edition::query()->where('edition_id', 'e1')->firstOrFail()->revision);
    }

    public function test_a_replace_takes_the_revision_of_the_browser_when_it_is_higher(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1', ['revision' => 2]);

        $this->actingAs($user)
            ->putJson('/api/editions/e1', Editions::payload('e1', [
                'baseRevision' => 2,
                'revision' => 6,
                'name' => 'Caught up',
                'elements' => ['box_lid' => ['name' => 'Doos']],
            ]))
            ->assertOk()
            ->assertJsonPath('revision', 6);

        $stored = Edition::query()->where('edition_id', 'e1')->firstOrFail();
        self::assertSame('Caught up', $stored->name);
        self::assertSame(['box_lid' => ['name' => 'Doos']], $stored->elements);
    }

    public function test_a_replace_on_an_old_revision_conflicts(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1', ['revision' => 5]);

        $this->actingAs($user)
            ->putJson('/api/editions/e1', Editions::payload('e1', ['baseRevision' => 4, 'revision' => 6, 'name' => 'Stale']))
            ->assertConflict();

        self::assertSame('Zaterdagclub', Edition::query()->where('edition_id', 'e1')->firstOrFail()->name);
    }

    public function test_a_replace_needs_a_matching_id_and_a_base_revision(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1');

        $this->actingAs($user)
            ->putJson('/api/editions/e1', Editions::payload('other', ['baseRevision' => 0]))
            ->assertUnprocessable();
        $this->actingAs($user)
            ->putJson('/api/editions/e1', Editions::payload('e1'))
            ->assertUnprocessable();
    }

    public function test_it_renames_with_a_revision_check(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1');

        $this->actingAs($user)
            ->patchJson('/api/editions/e1/name', ['baseRevision' => 0, 'name' => 'Nieuwe naam'])
            ->assertOk()
            ->assertJsonPath('name', 'Nieuwe naam')
            ->assertJsonPath('revision', 1);

        $this->actingAs($user)
            ->patchJson('/api/editions/e1/name', ['baseRevision' => 0, 'name' => 'Stale'])
            ->assertConflict();
        $this->actingAs($user)
            ->patchJson('/api/editions/e1/name', ['baseRevision' => 1, 'name' => ''])
            ->assertUnprocessable();
        $this->actingAs($user)
            ->patchJson('/api/editions/e1/name', ['baseRevision' => 1, 'name' => str_repeat('a', 121)])
            ->assertUnprocessable();

        self::assertSame('Nieuwe naam', Edition::query()->where('edition_id', 'e1')->firstOrFail()->name);
    }
}
