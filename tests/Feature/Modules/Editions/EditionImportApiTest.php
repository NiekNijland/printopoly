<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions;

use App\Models\Edition;
use App\Models\User;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class EditionImportApiTest extends TestCase
{
    use RefreshesMongoDatabase;

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
}
