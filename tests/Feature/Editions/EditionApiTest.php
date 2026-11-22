<?php

declare(strict_types=1);

namespace Tests\Feature\Editions;

use App\Events\EditionDeleted;
use App\Events\EditionDuplicated;
use App\Models\Edition;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\MakesEditions;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class EditionApiTest extends TestCase
{
    use MakesEditions;
    use RefreshesMongoDatabase;

    private User $user;

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    #[Test]
    public function every_endpoint_needs_a_login(): void
    {
        $this->getJson('/api/editions')->assertUnauthorized();
        $this->postJson('/api/editions', $this->editionPayload())->assertUnauthorized();
        $this->postJson('/api/editions/import', ['editions' => [$this->editionPayload()]])->assertUnauthorized();
        $this->getJson('/api/editions/e1')->assertUnauthorized();
        $this->patchJson('/api/editions/e1', ['baseRevision' => 0, 'name' => 'x'])->assertUnauthorized();
        $this->putJson('/api/editions/e1', $this->editionPayload() + ['baseRevision' => 0])->assertUnauthorized();
        $this->patchJson('/api/editions/e1/name', ['baseRevision' => 0, 'name' => 'x'])->assertUnauthorized();
        $this->postJson('/api/editions/e1/duplicate')->assertUnauthorized();
        $this->deleteJson('/api/editions/e1')->assertUnauthorized();
    }

    #[Test]
    public function it_lists_only_my_editions_newest_change_first(): void
    {
        $this->storeEdition($this->user, 'old', ['updatedAt' => 1_000, 'name' => 'Old']);
        $this->storeEdition($this->user, 'new', ['updatedAt' => 5_000, 'name' => 'New']);
        $this->storeEdition(User::factory()->create(), 'theirs');

        $this->actingAs($this->user)
            ->getJson('/api/editions')
            ->assertOk()
            ->assertJsonCount(2, 'editions')
            ->assertJsonPath('editions.0.id', 'new')
            ->assertJsonPath('editions.0.name', 'New')
            ->assertJsonPath('editions.0.revision', 0)
            ->assertJsonPath('editions.1.id', 'old')
            ->assertJsonPath('limit', 20);
    }

    #[Test]
    public function it_creates_an_edition_with_the_id_and_revision_of_the_browser(): void
    {
        $payload = $this->editionPayload('local-1', [
            'revision' => 7,
            'createdAt' => 1_111,
            'updatedAt' => 2_222,
            'elements' => ['space.01' => ['name' => 'Stadspark']],
        ]);

        $this->actingAs($this->user)
            ->postJson('/api/editions', $payload)
            ->assertCreated()
            ->assertJsonPath('edition.id', 'local-1')
            ->assertJsonPath('edition.revision', 7)
            ->assertJsonPath('edition.createdAt', 1_111)
            ->assertJsonPath('edition.elements', ['space.01' => ['name' => 'Stadspark']]);

        $stored = Edition::query()->where('edition_id', 'local-1')->firstOrFail();
        self::assertSame($this->user->publicId(), $stored->user_id);
        self::assertSame('Stadspark', $stored->elements['space.01']['name'] ?? null);
    }

    #[Test]
    public function an_empty_edition_returns_elements_as_an_object(): void
    {
        $this->actingAs($this->user)->postJson('/api/editions', $this->editionPayload());

        $content = (string) $this->actingAs($this->user)->getJson('/api/editions/e1')->assertOk()->getContent();

        self::assertStringContainsString('"elements":{}', $content);
    }

    #[Test]
    public function it_rejects_an_invalid_edition(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('bad id!', [
                'theme' => 'neon',
                'elements' => ['space.99' => ['name' => 'x']],
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('edition');

        self::assertSame(0, Edition::query()->count());
    }

    #[Test]
    public function it_never_replaces_an_existing_edition_on_create(): void
    {
        $this->storeEdition($this->user, 'e1', ['name' => 'Server version', 'revision' => 3]);

        $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('e1', ['name' => 'Local version']))
            ->assertConflict()
            ->assertJsonPath('code', 'conflict')
            ->assertJsonPath('current.name', 'Server version')
            ->assertJsonPath('current.revision', 3);

        self::assertSame('Server version', Edition::query()->where('edition_id', 'e1')->firstOrFail()->name);
    }

    #[Test]
    public function an_account_holds_twenty_editions(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            $this->storeEdition($this->user, "e{$i}");
        }

        $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('one-too-many'))
            ->assertUnprocessable()
            ->assertJsonPath('code', 'edition_limit')
            ->assertJsonPath('limit', 20);

        self::assertSame(20, Edition::query()->where('user_id', $this->user->publicId())->count());
    }

    #[Test]
    public function the_limit_comes_from_the_config(): void
    {
        config(['printopoly.limits.editions_per_account' => 1]);
        $this->storeEdition($this->user, 'e1');

        $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('e2'))
            ->assertUnprocessable()
            ->assertJsonPath('limit', 1);
    }

    #[Test]
    public function the_limit_is_per_account(): void
    {
        config(['printopoly.limits.editions_per_account' => 1]);
        $this->storeEdition(User::factory()->create(), 'theirs');

        $this->actingAs($this->user)->postJson('/api/editions', $this->editionPayload('mine'))->assertCreated();
    }

    #[Test]
    public function it_shows_an_edition(): void
    {
        $this->storeEdition($this->user, 'e1', ['name' => 'Mine']);

        $this->actingAs($this->user)
            ->getJson('/api/editions/e1')
            ->assertOk()
            ->assertJsonPath('edition.name', 'Mine')
            ->assertJsonPath('edition.boardProfile.panels', 4)
            ->assertJsonPath('edition.schemaVersion', 1);
    }

    #[Test]
    public function an_unknown_edition_is_not_found(): void
    {
        $this->actingAs($this->user)->getJson('/api/editions/nope')->assertNotFound();
    }

    #[Test]
    public function a_patch_changes_only_the_named_elements_and_bumps_the_revision(): void
    {
        $this->storeEdition($this->user, 'e1', [
            'elements' => [
                'space.01' => ['name' => 'Stadspark'],
                'space.03' => ['name' => 'Havenstraat'],
            ],
        ]);

        $this->actingAs($this->user)
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

    #[Test]
    public function a_patch_on_an_old_revision_conflicts_and_changes_nothing(): void
    {
        $this->storeEdition($this->user, 'e1', ['revision' => 4, 'name' => 'Server version']);

        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 3, 'name' => 'Stale window'])
            ->assertConflict()
            ->assertJsonPath('code', 'conflict')
            ->assertJsonPath('current.name', 'Server version')
            ->assertJsonPath('current.revision', 4);

        $stored = Edition::query()->where('edition_id', 'e1')->firstOrFail();
        self::assertSame('Server version', $stored->name);
        self::assertSame(4, $stored->revision);
    }

    #[Test]
    public function two_patches_on_the_same_revision_cannot_both_win(): void
    {
        $this->storeEdition($this->user, 'e1');

        $this->actingAs($this->user)->patchJson('/api/editions/e1', ['baseRevision' => 0, 'name' => 'First'])->assertOk();
        $this->actingAs($this->user)->patchJson('/api/editions/e1', ['baseRevision' => 0, 'name' => 'Second'])->assertConflict();

        self::assertSame('First', Edition::query()->where('edition_id', 'e1')->firstOrFail()->name);
    }

    #[Test]
    public function a_patch_with_a_bad_element_is_rejected(): void
    {
        $this->storeEdition($this->user, 'e1');

        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 0, 'elements' => ['space.01' => ['amount' => 5]]])
            ->assertUnprocessable();
        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 0, 'elements' => ['nonsense' => null]])
            ->assertUnprocessable();
        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 0])
            ->assertUnprocessable();
        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', ['name' => 'No base revision'])
            ->assertUnprocessable();

        self::assertSame(0, Edition::query()->where('edition_id', 'e1')->firstOrFail()->revision);
    }

    #[Test]
    public function a_replace_takes_the_revision_of_the_browser_when_it_is_higher(): void
    {
        $this->storeEdition($this->user, 'e1', ['revision' => 2]);

        $this->actingAs($this->user)
            ->putJson('/api/editions/e1', $this->editionPayload('e1', [
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

    #[Test]
    public function a_replace_on_an_old_revision_conflicts(): void
    {
        $this->storeEdition($this->user, 'e1', ['revision' => 5]);

        $this->actingAs($this->user)
            ->putJson('/api/editions/e1', $this->editionPayload('e1', ['baseRevision' => 4, 'revision' => 6, 'name' => 'Stale']))
            ->assertConflict();

        self::assertSame('Zaterdagclub', Edition::query()->where('edition_id', 'e1')->firstOrFail()->name);
    }

    #[Test]
    public function a_replace_needs_a_matching_id_and_a_base_revision(): void
    {
        $this->storeEdition($this->user, 'e1');

        $this->actingAs($this->user)
            ->putJson('/api/editions/e1', $this->editionPayload('other', ['baseRevision' => 0]))
            ->assertUnprocessable();
        $this->actingAs($this->user)
            ->putJson('/api/editions/e1', $this->editionPayload('e1'))
            ->assertUnprocessable();
    }

    #[Test]
    public function it_renames_with_a_revision_check(): void
    {
        $this->storeEdition($this->user, 'e1');

        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1/name', ['baseRevision' => 0, 'name' => 'Nieuwe naam'])
            ->assertOk()
            ->assertJsonPath('name', 'Nieuwe naam')
            ->assertJsonPath('revision', 1);

        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1/name', ['baseRevision' => 0, 'name' => 'Stale'])
            ->assertConflict();
        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1/name', ['baseRevision' => 1, 'name' => ''])
            ->assertUnprocessable();
        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1/name', ['baseRevision' => 1, 'name' => str_repeat('a', 121)])
            ->assertUnprocessable();

        self::assertSame('Nieuwe naam', Edition::query()->where('edition_id', 'e1')->firstOrFail()->name);
    }

    #[Test]
    public function it_duplicates_an_edition_as_a_new_one(): void
    {
        Event::fake([EditionDuplicated::class]);
        $this->storeEdition($this->user, 'e1', [
            'revision' => 9,
            'name' => 'Zaterdagclub',
            'elements' => ['space.01' => ['name' => 'Stadspark']],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/editions/e1/duplicate')
            ->assertCreated()
            ->assertJsonPath('edition.name', 'Zaterdagclub (kopie)')
            ->assertJsonPath('edition.revision', 0)
            ->assertJsonPath('edition.elements', ['space.01' => ['name' => 'Stadspark']]);

        $copyId = $response->json('edition.id');
        self::assertIsString($copyId);
        self::assertNotSame('e1', $copyId);
        self::assertSame(2, Edition::query()->where('user_id', $this->user->publicId())->count());
        Event::assertDispatched(EditionDuplicated::class, fn (EditionDuplicated $event): bool => $event->sourceId === 'e1' && $event->copyId === $copyId);
    }

    #[Test]
    public function it_keeps_the_template_an_edition_started_from(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('t1', ['template' => 'village']))
            ->assertCreated()
            ->assertJsonPath('edition.template', 'village');

        // A browser from before B152 sends no template: the stored one stays.
        $this->actingAs($this->user)
            ->putJson('/api/editions/t1', $this->editionPayload('t1', ['baseRevision' => 0, 'revision' => 1]))
            ->assertOk();
        $this->actingAs($this->user)
            ->getJson('/api/editions/t1')
            ->assertJsonPath('edition.template', 'village');

        $copy = $this->actingAs($this->user)
            ->postJson('/api/editions/t1/duplicate')
            ->assertCreated();
        self::assertSame('village', $copy->json('edition.template'));

        // An unknown template is dropped, and a blank edition has none.
        $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('t2', ['template' => 'circus']))
            ->assertCreated()
            ->assertJsonMissingPath('edition.template');
        $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('t3'))
            ->assertCreated()
            ->assertJsonMissingPath('edition.template');
    }

    #[Test]
    public function it_keeps_kinderfeest_and_the_earlier_versions_of_rewritten_templates(): void
    {
        // Kinderfeest is new; club1 and birthday1 are the versions before the rewrite (B186, B193).
        foreach (['kidsparty', 'club1', 'birthday1'] as $index => $template) {
            $this->actingAs($this->user)
                ->postJson('/api/editions', $this->editionPayload("v{$index}", ['template' => $template]))
                ->assertCreated()
                ->assertJsonPath('edition.template', $template);
        }
    }

    #[Test]
    public function it_saves_a_deck_whose_cards_were_cleared(): void
    {
        // "Kaarten leegmaken" leaves standard cards with an empty text (B194).
        $response = $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('c1', ['elements' => [
                'card.chance.01' => ['text' => ''],
                'card.chance.07' => ['text' => '', 'amount' => 40],
            ]]))
            ->assertCreated();

        $elements = $response->json('edition.elements');
        self::assertIsArray($elements);
        self::assertSame(['text' => ''], $elements['card.chance.01'] ?? null);
        self::assertSame(['text' => '', 'amount' => 40], $elements['card.chance.07'] ?? null);
    }

    #[Test]
    public function a_copy_of_an_english_edition_says_copy_and_can_be_named(): void
    {
        $this->storeEdition($this->user, 'e1', ['language' => 'en', 'name' => 'Club']);

        $this->actingAs($this->user)->postJson('/api/editions/e1/duplicate')
            ->assertJsonPath('edition.name', 'Club (copy)');
        $this->actingAs($this->user)->postJson('/api/editions/e1/duplicate', ['name' => 'Eigen naam'])
            ->assertJsonPath('edition.name', 'Eigen naam');
    }

    #[Test]
    public function a_duplicate_respects_the_limit(): void
    {
        config(['printopoly.limits.editions_per_account' => 1]);
        $this->storeEdition($this->user, 'e1');

        $this->actingAs($this->user)->postJson('/api/editions/e1/duplicate')
            ->assertUnprocessable()
            ->assertJsonPath('code', 'edition_limit');
    }

    #[Test]
    public function it_deletes_an_edition(): void
    {
        Event::fake([EditionDeleted::class]);
        $this->storeEdition($this->user, 'e1');
        $this->storeEdition($this->user, 'e2');

        $this->actingAs($this->user)->deleteJson('/api/editions/e1')->assertNoContent();

        self::assertSame(['e2'], Edition::query()->pluck('edition_id')->all());
        Event::assertDispatched(EditionDeleted::class, fn (EditionDeleted $event): bool => $event->editionId === 'e1' && $event->userId === $this->user->publicId());
        $this->actingAs($this->user)->getJson('/api/editions/e1')->assertNotFound();
    }

    #[Test]
    public function the_import_stores_what_it_can_and_reports_the_rest(): void
    {
        config(['printopoly.limits.editions_per_account' => 3]);
        $this->storeEdition($this->user, 'existing', ['name' => 'Server version']);

        $this->actingAs($this->user)
            ->postJson('/api/editions/import', ['editions' => [
                $this->editionPayload('existing', ['name' => 'Local version']),
                $this->editionPayload('a', ['revision' => 4]),
                $this->editionPayload('broken', ['language' => 'fr']),
                $this->editionPayload('b'),
                $this->editionPayload('c'),
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

    #[Test]
    public function the_import_needs_a_list_of_editions(): void
    {
        $this->actingAs($this->user)->postJson('/api/editions/import', [])->assertUnprocessable();
        $this->actingAs($this->user)->postJson('/api/editions/import', ['editions' => []])->assertUnprocessable();
        $this->actingAs($this->user)->postJson('/api/editions/import', ['editions' => 'nope'])->assertUnprocessable();
        $this->actingAs($this->user)
            ->postJson('/api/editions/import', ['editions' => array_fill(0, 51, $this->editionPayload())])
            ->assertUnprocessable();
    }

    #[Test]
    public function the_api_is_rate_limited_per_account(): void
    {
        for ($i = 0; $i < 300; $i++) {
            $this->actingAs($this->user)->getJson('/api/editions')->assertOk();
        }

        $this->actingAs($this->user)->getJson('/api/editions')->assertTooManyRequests();
        $this->actingAs(User::factory()->create())->getJson('/api/editions')->assertOk();
    }

    #[Test]
    public function creating_editions_has_a_lower_limit(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->actingAs($this->user)->postJson('/api/editions', ['nonsense' => true])->assertUnprocessable();
        }

        $this->actingAs($this->user)->postJson('/api/editions', ['nonsense' => true])->assertTooManyRequests();
        $this->actingAs($this->user)->getJson('/api/editions')->assertOk();
    }
}
