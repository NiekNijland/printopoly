<?php

declare(strict_types=1);

namespace Tests\Feature\Editions;

use App\Events\EditionDeleted;
use App\Events\EditionDuplicated;
use App\Models\Edition;
use App\Models\User;
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

    public function test_it_duplicates_an_edition_as_a_new_one(): void
    {
        $user = User::factory()->create();

        Event::fake([EditionDuplicated::class]);
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
        Event::assertDispatched(EditionDuplicated::class, fn (EditionDuplicated $event): bool => $event->sourceId === 'e1' && $event->copyId === $copyId);
    }

    public function test_it_keeps_the_template_an_edition_started_from(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('t1', ['template' => 'village']))
            ->assertCreated()
            ->assertJsonPath('edition.template', 'village');

        // A browser from before B152 sends no template: the stored one stays.
        $this->actingAs($user)
            ->putJson('/api/editions/t1', Editions::payload('t1', ['baseRevision' => 0, 'revision' => 1]))
            ->assertOk();
        $this->actingAs($user)
            ->getJson('/api/editions/t1')
            ->assertJsonPath('edition.template', 'village');

        $copy = $this->actingAs($user)
            ->postJson('/api/editions/t1/duplicate')
            ->assertCreated();
        self::assertSame('village', $copy->json('edition.template'));

        // An unknown template is dropped, and a blank edition has none.
        $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('t2', ['template' => 'circus']))
            ->assertCreated()
            ->assertJsonMissingPath('edition.template');
        $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('t3'))
            ->assertCreated()
            ->assertJsonMissingPath('edition.template');
    }

    public function test_it_keeps_the_new_templates_and_the_hidden_ones(): void
    {
        $user = User::factory()->create();

        // Feest and Groep are new (B201); the others are no longer offered but stay as the baseline of editions
        // that started from them, as do the versions from before a rewrite (B152, B193). Leeg (B259) is its own
        // baseline, so an untouched Leeg edition shows no change dots on another device either.
        $templates = ['party', 'group', 'company', 'school', 'club', 'bachelor', 'birthday', 'kidsparty', 'club1', 'birthday1', 'empty'];
        foreach ($templates as $index => $template) {
            $this->actingAs($user)
                ->postJson('/api/editions', Editions::payload("v{$index}", ['template' => $template]))
                ->assertCreated()
                ->assertJsonPath('edition.template', $template);
        }
    }

    public function test_it_saves_names_that_were_cleared(): void
    {
        $user = User::factory()->create();

        // "Namen leegmaken" leaves the streets, stations and utilities with an empty name (B201).
        $response = $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('n1', ['elements' => [
                'space.01' => ['name' => ''],
                'space.05' => ['name' => ''],
            ]]))
            ->assertCreated();

        $elements = $response->json('edition.elements');
        self::assertIsArray($elements);
        self::assertSame(['name' => ''], $elements['space.01'] ?? null);
        self::assertSame(['name' => ''], $elements['space.05'] ?? null);
    }

    public function test_it_saves_a_deck_whose_cards_were_cleared(): void
    {
        $user = User::factory()->create();

        // "Kaarten leegmaken" leaves standard cards with an empty text (B194).
        $response = $this->actingAs($user)
            ->postJson('/api/editions', Editions::payload('c1', ['elements' => [
                'card.chance.01' => ['text' => ''],
                'card.chance.07' => ['text' => '', 'amount' => 40],
            ]]))
            ->assertCreated();

        $elements = $response->json('edition.elements');
        self::assertIsArray($elements);
        self::assertSame(['text' => ''], $elements['card.chance.01'] ?? null);
        self::assertSame(['text' => '', 'amount' => 40], $elements['card.chance.07'] ?? null);
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

    public function test_it_deletes_an_edition(): void
    {
        $user = User::factory()->create();

        Event::fake([EditionDeleted::class]);
        Editions::store($user, 'e1');
        Editions::store($user, 'e2');

        $this->actingAs($user)->deleteJson('/api/editions/e1')->assertNoContent();

        self::assertSame(['e2'], Edition::query()->pluck('edition_id')->all());
        Event::assertDispatched(EditionDeleted::class, fn (EditionDeleted $event): bool => $event->editionId === 'e1' && $event->userId === $user->publicId());
        $this->actingAs($user)->getJson('/api/editions/e1')->assertNotFound();
    }

    public function test_the_import_stores_what_it_can_and_reports_the_rest(): void
    {
        $user = User::factory()->create();

        config(['printopoly.limits.editions_per_account' => 3]);
        Editions::store($user, 'existing', ['name' => 'Server version']);

        $this->actingAs($user)
            ->postJson('/api/editions/import', ['editions' => [
                Editions::payload('existing', ['name' => 'Local version']),
                Editions::payload('a', ['revision' => 4]),
                Editions::payload('broken', ['language' => 'fr']),
                Editions::payload('b'),
                Editions::payload('c'),
            ]])
            ->assertOk()
            ->assertJsonPath('imported', ['a', 'b'])
            ->assertJsonPath('conflicts', ['existing'])
            ->assertJsonPath('overLimit', ['c'])
            ->assertJsonPath('invalid.broken.0', 'language: must be "nl" or "en"');

        self::assertSame('Server version', Edition::query()->where('edition_id', 'existing')->firstOrFail()->name);
        self::assertSame(4, Edition::query()->where('edition_id', 'a')->firstOrFail()->revision);
        self::assertSame(3, Edition::query()->count());
    }

    public function test_the_import_needs_a_list_of_editions(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/editions/import', [])->assertUnprocessable();
        $this->actingAs($user)->postJson('/api/editions/import', ['editions' => []])->assertUnprocessable();
        $this->actingAs($user)->postJson('/api/editions/import', ['editions' => 'nope'])->assertUnprocessable();
        $this->actingAs($user)
            ->postJson('/api/editions/import', ['editions' => array_fill(0, 51, Editions::payload())])
            ->assertUnprocessable();
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
