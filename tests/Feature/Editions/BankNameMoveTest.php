<?php

declare(strict_types=1);

namespace Tests\Feature\Editions;

use App\Edition\EditionPayload;
use App\Models\Edition;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\MakesEditions;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * The bank name moved from its own element `bank` into the words of the edition, `words.bank` (B148).
 */
final class BankNameMoveTest extends TestCase
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
    public function an_edition_sent_with_the_old_key_is_stored_with_the_new_one(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('e1', [
                'elements' => ['bank' => ['name' => 'Bank van de club']],
            ]))
            ->assertCreated();

        self::assertSame(['words.bank' => ['name' => 'Bank van de club']], $response->json('edition.elements'));

        $stored = Edition::query()->where('edition_id', 'e1')->firstOrFail();
        self::assertSame(['words.bank' => ['name' => 'Bank van de club']], $stored->elements);
    }

    #[Test]
    public function a_patch_from_an_older_browser_lands_on_the_new_key(): void
    {
        $this->storeEdition($this->user, 'e1');

        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', [
                'baseRevision' => 0,
                'elements' => ['bank' => ['name' => 'Oud']],
            ])
            ->assertOk();

        $stored = Edition::query()->where('edition_id', 'e1')->firstOrFail();
        self::assertSame(['words.bank' => ['name' => 'Oud']], $stored->elements);
    }

    #[Test]
    public function the_migration_rewrites_stored_editions_and_keeps_the_revision(): void
    {
        $edition = $this->storeEdition($this->user, 'e1', ['revision' => 4]);
        // As stored before B148: written straight into the database, past the validator.
        Edition::query()->where('_id', $edition->getKey())->update(['elements' => [
            'bank' => ['name' => 'Bank van Raalte'],
            'space.01' => ['name' => 'Dorpsstraat'],
        ]]);
        $untouched = $this->storeEdition($this->user, 'e2', ['elements' => ['space.03' => ['name' => 'Kerkpad']]]);

        // What a browser gets before the migration has run already carries the new key.
        $payload = EditionPayload::from(Edition::query()->where('edition_id', 'e1')->firstOrFail());
        $elements = $payload['elements'];
        self::assertIsArray($elements);
        self::assertSame(['name' => 'Bank van Raalte'], $elements['words.bank'] ?? null);

        $migration = require database_path('migrations/2026_11_21_180000_move_bank_name_into_words.php');
        self::assertInstanceOf(Migration::class, $migration);
        self::assertTrue(method_exists($migration, 'up'));
        $migration->up();

        $stored = Edition::query()->where('edition_id', 'e1')->firstOrFail();
        self::assertSame(4, $stored->revision);
        self::assertSame([
            'space.01' => ['name' => 'Dorpsstraat'],
            'words.bank' => ['name' => 'Bank van Raalte'],
        ], $stored->elements);
        self::assertSame(['space.03' => ['name' => 'Kerkpad']], $untouched->fresh()?->elements);
    }

    #[Test]
    public function a_patch_on_an_edition_the_migration_missed_drops_the_old_key(): void
    {
        $edition = $this->storeEdition($this->user, 'e1');
        Edition::query()->where('_id', $edition->getKey())->update(['elements' => ['bank' => ['name' => 'Oud']]]);

        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', [
                'baseRevision' => 0,
                'elements' => ['words.bank' => ['name' => 'Nieuw']],
            ])
            ->assertOk();

        $stored = Edition::query()->where('edition_id', 'e1')->firstOrFail();
        self::assertSame(['words.bank' => ['name' => 'Nieuw']], $stored->elements);
    }
}
