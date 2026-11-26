<?php

declare(strict_types=1);

namespace Tests\Feature\Editions;

use App\Models\Edition;
use App\Models\User;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Override;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

/**
 * An account edition that breaks a rule is repaired when it is read, so it always opens (round 4, bug 1). Swapping
 * two streets of different colour groups used to move their own amounts along, out of their range.
 */
final class EditionRepairTest extends TestCase
{
    use RefreshesMongoDatabase;

    /** @var list<MessageLogged> */
    private array $logged = [];

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        Event::listen(MessageLogged::class, function (MessageLogged $message): void {
            $this->logged[] = $message;
        });
    }

    /**
     * @return list<MessageLogged>
     */
    private function warnings(): array
    {
        return array_values(array_filter($this->logged, fn (MessageLogged $message): bool => $message->level === 'warning'));
    }

    public function test_an_edition_with_amounts_of_another_colour_group_opens_repaired_and_the_repair_is_logged(): void
    {
        $user = User::factory()->create();

        $edition = Editions::store($user, 'e1');
        // Exactly the shape of the old swap, written past the validator: the light blue price on the brown street.
        Edition::query()->where('_id', $edition->getKey())->update(['elements' => [
            'space.01' => ['name' => 'Kaperspad', 'amounts' => ['price' => 120, 'rent.1' => 12]],
            'space.06' => ['name' => 'Ankerbaai', 'amounts' => ['price' => 70, 'mortgage' => 30]],
            'deed.01' => ['name' => 'Kaperspad'],
        ]]);

        $this->actingAs($user)
            ->getJson('/api/editions/e1')
            ->assertOk()
            ->assertJsonPath('edition.id', 'e1')
            ->assertJsonPath('edition.elements', [
                'space.01' => ['name' => 'Kaperspad', 'amounts' => ['price' => 72, 'rent.1' => 12]],
                'space.06' => ['name' => 'Ankerbaai', 'amounts' => ['price' => 80, 'mortgage' => 40]],
                'deed.01' => ['name' => 'Kaperspad'],
            ]);

        $warnings = $this->warnings();
        self::assertCount(1, $warnings);
        self::assertSame('Edition repaired on read', $warnings[0]->message);
        self::assertSame('e1', $warnings[0]->context['edition']);
        $repaired = $warnings[0]->context['repaired'];
        self::assertIsArray($repaired);
        self::assertContains('elements.space.01.amounts: pulled into range', $repaired);
    }

    public function test_fields_and_elements_that_cannot_be_read_are_dropped_and_the_rest_stays(): void
    {
        $user = User::factory()->create();

        $edition = Editions::store($user, 'e1');
        Edition::query()->where('_id', $edition->getKey())->update(['elements' => [
            'space.01' => ['name' => 'Ankerbaai', 'amounts' => ['price' => 66, 'bogus' => 3], 'photoStyle' => 'sideways'],
            'space.02' => ['text' => 'not a corner'],
            'nothing.here' => ['name' => 'x'],
            'card.chance.17' => ['text' => 'no added flag'],
            'card.chance.18' => ['added' => true, 'text' => 'Storm', 'amount' => 9999],
        ]]);

        $elements = $this->actingAs($user)->getJson('/api/editions/e1')->assertOk()->json('edition.elements');

        self::assertSame([
            'space.01' => ['name' => 'Ankerbaai', 'amounts' => ['price' => 66]],
            'card.chance.18' => ['added' => true, 'text' => 'Storm'],
        ], $elements);
    }

    public function test_a_valid_edition_is_read_as_stored_without_a_warning(): void
    {
        $user = User::factory()->create();

        Editions::store($user, 'e1', ['elements' => ['space.01' => ['name' => 'A', 'amounts' => ['price' => 70]]]]);

        $this->actingAs($user)
            ->getJson('/api/editions/e1')
            ->assertOk()
            ->assertJsonPath('edition.elements', ['space.01' => ['name' => 'A', 'amounts' => ['price' => 70]]]);

        self::assertSame([], $this->warnings());
    }
}
