<?php

declare(strict_types=1);

namespace Tests\Feature\Editions;

use App\Edition\PrintSelection;
use App\Models\Edition;
use App\Models\User;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\MakesEditions;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * What goes in the print set travels with the edition (B198): the print page chooses it, the account keeps it, the
 * editor reads it. A part that is gone (B200) or a value of the wrong shape is dropped, never refused.
 */
final class PrintSelectionTest extends TestCase
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
    public function an_edition_keeps_its_print_selection_in_the_account(): void
    {
        $payload = $this->editionPayload('local-1', [
            'printSelection' => ['set' => 'printer', 'parts' => ['invitation', 'cards', 'dice']],
        ]);

        $this->actingAs($this->user)
            ->postJson('/api/editions', $payload)
            ->assertCreated()
            ->assertJsonPath('edition.printSelection', ['set' => 'printer', 'parts' => ['board', 'cards', 'invitation']]);

        $this->actingAs($this->user)
            ->getJson('/api/editions/local-1')
            ->assertOk()
            ->assertJsonPath('edition.printSelection.set', 'printer');
    }

    #[Test]
    public function a_patch_changes_or_forgets_the_print_selection(): void
    {
        $this->storeEdition($this->user);

        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 0, 'printSelection' => ['set' => 'home', 'parts' => ['money']]])
            ->assertOk();
        self::assertSame(['set' => 'home', 'parts' => ['board', 'money']], Edition::query()->where('edition_id', 'e1')->firstOrFail()->print_selection);

        $this->actingAs($this->user)
            ->patchJson('/api/editions/e1', ['baseRevision' => 1, 'printSelection' => null])
            ->assertOk();
        $this->actingAs($this->user)
            ->getJson('/api/editions/e1')
            ->assertOk()
            ->assertJsonMissingPath('edition.printSelection');
    }

    #[Test]
    public function a_value_of_the_wrong_shape_is_dropped_not_refused(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/editions', $this->editionPayload('local-2', ['printSelection' => ['set' => 'shop', 'parts' => []]]))
            ->assertCreated()
            ->assertJsonMissingPath('edition.printSelection');

        self::assertNull(PrintSelection::parse('home'));
        self::assertNull(PrintSelection::parse(['set' => 'home']));
    }
}
