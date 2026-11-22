<?php

declare(strict_types=1);

namespace Tests\Feature\Editions;

use App\Models\Edition;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\MakesEditions;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * An account edition that breaks a rule is repaired when it is read, so it always opens (round 4, bug 1). Swapping
 * two streets of different colour groups used to move their own amounts along, out of their range.
 */
final class EditionRepairTest extends TestCase
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
    public function an_edition_with_amounts_of_another_colour_group_opens_repaired_and_the_repair_is_logged(): void
    {
        Log::spy();
        $edition = $this->storeEdition($this->user, 'e1');
        // Exactly the shape of the old swap, written past the validator: the light blue price on the brown street.
        Edition::query()->where('_id', $edition->getKey())->update(['elements' => [
            'space.01' => ['name' => 'Kaperspad', 'amounts' => ['price' => 120, 'rent.1' => 12]],
            'space.06' => ['name' => 'Ankerbaai', 'amounts' => ['price' => 70, 'mortgage' => 30]],
            'deed.01' => ['name' => 'Kaperspad'],
        ]]);

        $this->actingAs($this->user)
            ->getJson('/api/editions/e1')
            ->assertOk()
            ->assertJsonPath('edition.id', 'e1')
            ->assertJsonPath('edition.elements', [
                'space.01' => ['name' => 'Kaperspad', 'amounts' => ['price' => 72, 'rent.1' => 12]],
                'space.06' => ['name' => 'Ankerbaai', 'amounts' => ['price' => 80, 'mortgage' => 40]],
                'deed.01' => ['name' => 'Kaperspad'],
            ]);

        Log::shouldHaveReceived('warning')->once()->withArgs(
            fn (string $message, array $context): bool => $message === 'Edition repaired on read'
                && $context['edition'] === 'e1'
                && in_array('elements.space.01.amounts: pulled into range', $context['repaired'], true),
        );
    }

    #[Test]
    public function fields_and_elements_that_cannot_be_read_are_dropped_and_the_rest_stays(): void
    {
        $edition = $this->storeEdition($this->user, 'e1');
        Edition::query()->where('_id', $edition->getKey())->update(['elements' => [
            'space.01' => ['name' => 'Ankerbaai', 'amounts' => ['price' => 66, 'bogus' => 3], 'photoStyle' => 'sideways'],
            'space.02' => ['text' => 'not a corner'],
            'nothing.here' => ['name' => 'x'],
            'card.chance.17' => ['text' => 'no added flag'],
            'card.chance.18' => ['added' => true, 'text' => 'Storm', 'amount' => 9999],
        ]]);

        $elements = $this->actingAs($this->user)->getJson('/api/editions/e1')->assertOk()->json('edition.elements');

        self::assertSame([
            'space.01' => ['name' => 'Ankerbaai', 'amounts' => ['price' => 66]],
            'card.chance.18' => ['added' => true, 'text' => 'Storm'],
        ], $elements);
    }

    #[Test]
    public function a_valid_edition_is_read_as_stored_without_a_warning(): void
    {
        Log::spy();
        $this->storeEdition($this->user, 'e1', ['elements' => ['space.01' => ['name' => 'A', 'amounts' => ['price' => 70]]]]);

        $this->actingAs($this->user)
            ->getJson('/api/editions/e1')
            ->assertOk()
            ->assertJsonPath('edition.elements', ['space.01' => ['name' => 'A', 'amounts' => ['price' => 70]]]);

        Log::shouldNotHaveReceived('warning');
    }
}
