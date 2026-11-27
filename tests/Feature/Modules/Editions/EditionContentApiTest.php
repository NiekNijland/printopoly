<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions;

use App\Models\User;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class EditionContentApiTest extends TestCase
{
    use RefreshesMongoDatabase;

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
}
