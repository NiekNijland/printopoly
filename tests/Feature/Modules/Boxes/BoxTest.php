<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Events\BoxActivityEvent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\Support\BoxScenario;
use Tests\TestCase;

/**
 * "Samen maken" (B128): the owner makes a box, friends add to it through the link, and only the owner reads and
 * decides. A friend can add, never read what others added.
 */
final class BoxTest extends TestCase
{
    use RefreshesMongoDatabase;
    use UsesLocalBoxDisk;

    public function test_a_box_works_without_an_account_and_only_stores_a_snapshot_of_names(): void
    {
        $box = BoxScenario::makeBox($this);

        $stored = CollectionBox::query()->findOrFail($box['id']);
        self::assertNull($stored->user_id);
        self::assertSame(40, mb_strlen($stored->token));
        self::assertNotSame($box['ownerSecret'], $stored->owner_hash, 'only a hash of the owner secret is stored');
        self::assertSame(['theme' => 'classic', 'currency' => 'eur', 'parts' => ['cards' => true, 'pawns' => false], 'elements' => ['space.01' => ['name' => 'Molenweg'], 'card.chance.01' => ['text' => 'Ga naar start']]], $stored->snapshot, 'photos and other fields are dropped');
        self::assertTrue($stored->expires_at->isAfter(CarbonImmutable::now()->addDays(29)));
        self::assertSame('/nl/box/' . $box['token'], parse_url($box['url'], PHP_URL_PATH));
    }

    public function test_the_snapshot_keeps_renamed_decks_and_drops_other_words(): void
    {
        $box = BoxScenario::makeBox($this, ['snapshot' => ['elements' => [
            'words.chance' => ['name' => '  Loterij  ', 'text' => 'Loterijen'],
            'words.chest' => ['name' => ''],
            'words.bank' => ['name' => 'Bank van de club'],
        ]]]);

        $stored = CollectionBox::query()->findOrFail($box['id']);
        self::assertSame(['words.chance' => ['name' => 'Loterij']], $stored->snapshot['elements'] ?? null);
    }

    public function test_the_snapshot_keeps_the_words_a_card_text_holds(): void
    {
        $box = BoxScenario::makeBox($this, ['snapshot' => ['elements' => [
            'words.station' => ['name' => 'Bushalte', 'text' => 'Bushaltes'],
            'words.utility' => ['name' => 'Fabriek'],
            'words.house' => ['name' => 'Hut', 'text' => str_repeat('h', 60)],
            'words.jail' => ['name' => 'de strafbank'],
            'words.currency' => ['name' => 'Pegels', 'text' => 'PEGELSXX'],
        ]]]);

        $stored = CollectionBox::query()->findOrFail($box['id']);
        self::assertSame([
            'words.station' => ['name' => 'Bushalte', 'text' => 'Bushaltes'],
            'words.utility' => ['name' => 'Fabriek'],
            'words.house' => ['name' => 'Hut', 'text' => str_repeat('h', 40)],
            'words.jail' => ['name' => 'de strafbank'],
            'words.currency' => ['name' => 'Pegels', 'text' => 'PEGELS'],
        ], $stored->snapshot['elements'] ?? null);
    }

    public function test_friends_open_the_link_without_an_account_and_see_the_names_but_not_the_secrets(): void
    {
        $box = BoxScenario::makeBox($this);

        $this->get('/nl/box/' . $box['token'])
            ->assertOk()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->component('boxes/show')
                ->where('box.editionName', 'Zaterdagclub')
                ->where('box.status', 'open')
                ->where('box.snapshot.elements', static fn (mixed $elements): bool => data_get($elements, ['space.01', 'name']) === 'Molenweg')
                ->missing('box.ownerSecret')
                ->missing('box.owner_hash')
                ->missing('box.id'));
        $this->get('/nl/box/' . str_repeat('a', 40))->assertNotFound();
    }

    public function test_a_friend_adds_a_photo_and_a_name_with_their_first_name(): void
    {
        Event::fake([BoxActivityEvent::class]);
        $box = BoxScenario::makeBox($this);

        $response = BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo()]);
        $response->assertCreated();
        self::assertSame(32, mb_strlen(BoxScenario::text($response, 'receipt')));
        Event::assertDispatched(BoxActivityEvent::class, static fn (BoxActivityEvent $event): bool => $event->pending === 1);

        $contribution = BoxContribution::query()->firstOrFail();
        self::assertSame('Sanne', $contribution->first_name);
        self::assertSame('Kerkstraat', $contribution->value);
        self::assertSame('space.01', $contribution->element_key);
        self::assertTrue(Storage::disk('local')->exists((string) $contribution->preview_path));
        self::assertTrue(Storage::disk('local')->exists((string) $contribution->print_path));
        self::assertStringStartsWith('box-photos/', (string) $contribution->print_path, 'private, on the configured disk');
    }

    public function test_a_card_gets_a_text_and_a_pawn_a_name(): void
    {
        $box = BoxScenario::makeBox($this);

        BoxScenario::contribute($this, $box['token'], ['elementKey' => 'card.chest.03', 'value' => 'Je krijgt taart van oma.'])->assertCreated();
        BoxScenario::contribute($this, $box['token'], ['elementKey' => 'pawn.02', 'value' => 'Kees'])->assertCreated();

        self::assertSame(2, BoxContribution::query()->count());
    }

    public function test_a_colour_group_takes_a_town_but_never_a_photo(): void
    {
        $box = BoxScenario::makeBox($this);

        BoxScenario::contribute($this, $box['token'], ['elementKey' => 'group.brown', 'value' => 'Raalte'])->assertCreated();
        BoxScenario::contribute($this, $box['token'], ['elementKey' => 'group.brown', 'value' => 'Heino', 'photo' => BoxScenario::photo()])->assertUnprocessable();
        BoxScenario::contribute($this, $box['token'], ['elementKey' => 'group.purple', 'value' => 'Olst'])->assertUnprocessable();

        $id = BoxContribution::query()->firstOrFail()->publicId();
        $this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner($box['ownerSecret']))
            ->assertJsonPath('contributions.0.field', 'town')
            ->assertJsonPath('contributions.0.id', $id);
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_a_friend_cannot_reach_what_is_not_theirs_to_add_to(): void
    {
        $friend = 0;
        $box = BoxScenario::makeBox($this);

        foreach (['box_lid', 'board_center', 'bank', 'note.5', 'space.40', 'space.99', 'card.chance.17', 'pawn.09', 'deed.01', '../x'] as $key) {
            BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => $key])->assertUnprocessable();
        }

        self::assertSame(0, BoxContribution::query()->count());
    }

    public function test_friends_add_to_the_extra_cards_the_edition_has_and_nothing_past_them(): void
    {
        $friend = 0;
        $box = BoxScenario::makeBox($this, ['snapshot' => ['elements' => [
            'card.chance.17' => ['added' => true, 'text' => 'Je wint de pubquiz.'],
            'card.chest.18' => ['added' => true],
            // Not an extra card without `added`, and never past the 32 of a deck (B135).
            'card.chest.19' => ['text' => 'niet toegevoegd'],
            'card.chance.33' => ['added' => true],
        ]]]);

        $stored = CollectionBox::query()->findOrFail($box['id']);
        self::assertSame([
            'card.chance.17' => ['added' => true, 'text' => 'Je wint de pubquiz.'],
            'card.chest.18' => ['added' => true],
        ], $stored->snapshot['elements']);
        $this->get('/nl/box/' . $box['token'])->assertOk()->assertInertia(
            fn (AssertableInertia $page): AssertableInertia => $page->has('box.snapshot.elements', 2),
        );

        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chance.17', 'value' => 'Je wint de bingo.'])->assertCreated();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chest.18', 'value' => 'Oma trakteert.', 'photo' => BoxScenario::photo()])->assertCreated();

        foreach (['card.chest.17', 'card.chest.19', 'card.chance.18', 'card.chance.33'] as $key) {
            BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => $key, 'value' => 'Iets'])->assertUnprocessable();
        }

        self::assertSame(['card.chance.17', 'card.chest.18'], BoxContribution::query()->oldest()->pluck('element_key')->all());

        // The owner takes the extra card out again: friends can no longer add to it.
        $this->patchJson('/api/boxes/' . $box['id'], ['snapshot' => ['elements' => ['card.chance.17' => ['added' => true]]]], BoxScenario::owner($box['ownerSecret']))
            ->assertOk();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chest.18', 'value' => 'Nog een'])->assertUnprocessable();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chance.17', 'value' => 'Nog een'])->assertCreated();

        // Without the cards in the set there is nothing to add to.
        $this->patchJson('/api/boxes/' . $box['id'], ['snapshot' => ['parts' => ['cards' => false], 'elements' => ['card.chance.17' => ['added' => true]]]], BoxScenario::owner($box['ownerSecret']))
            ->assertOk();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chance.17', 'value' => 'Weer een'])->assertUnprocessable();
    }

    public function test_friends_cannot_pick_spaces_without_a_photo_or_a_name_of_their_own(): void
    {
        $friend = 0;
        $box = BoxScenario::makeBox($this, ['snapshot' => ['elements' => ['space.04' => ['name' => 'Belasting voor de kas']]]]);

        // Bug 18 of round 3: Algemeen Fonds, Kans and the tax spaces show neither a photo nor a name of their own.
        foreach (['space.02', 'space.07', 'space.17', 'space.22', 'space.33', 'space.36', 'space.04', 'space.38'] as $key) {
            BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => $key, 'photo' => BoxScenario::photo()])->assertUnprocessable();
        }

        foreach (['space.00', 'space.10', 'space.20', 'space.30', 'space.05', 'space.12', 'space.39'] as $key) {
            BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => $key, 'value' => 'Iets'])->assertCreated();
        }

        // The board on the friends' page still shows the names of those spaces.
        self::assertSame(['name' => 'Belasting voor de kas'], CollectionBox::query()->findOrFail($box['id'])->snapshot['elements']['space.04'] ?? null);
    }

    public function test_a_friend_proposes_an_amount_for_a_card_within_its_range(): void
    {
        $friend = 0;
        $box = BoxScenario::makeBox($this, ['snapshot' => ['elements' => ['card.chance.17' => ['added' => true]]]]);

        // card.chest.02 pays out 200 (160 to 240); card.chance.01 has no amount.
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chest.02', 'value' => '', 'amount' => 220])->assertCreated();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chest.02', 'value' => 'Fout van de bank', 'amount' => 900])
            ->assertUnprocessable()
            ->assertJsonPath('errors.amount.0', __('boxes.amount_not_allowed'));
        // The direction is free since B220 (R5-11): paying 200 is within the range too.
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chest.02', 'amount' => -200])->assertCreated();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chest.02', 'amount' => -900])->assertUnprocessable();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chance.01', 'amount' => 50])->assertUnprocessable();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'space.01', 'amount' => 50])->assertUnprocessable();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'card.chance.17', 'value' => 'Pubquiz', 'amount' => -75])->assertCreated();

        self::assertSame([220, -200, -75], BoxContribution::query()->oldest()->pluck('amount')->all());
        $this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner($box['ownerSecret']))
            ->assertJsonPath('contributions.0.amount', 220)
            ->assertJsonPath('contributions.0.open', ['amount'])
            ->assertJsonPath('contributions.1.open', ['text', 'amount']);
    }

    public function test_a_friend_proposes_a_new_card_while_the_deck_has_room(): void
    {
        $friend = 0;
        $full = [];
        for ($number = 17; $number <= 32; $number++) {
            $full['card.chest.' . $number] = ['added' => true];
        }

        $box = BoxScenario::makeBox($this, ['snapshot' => ['elements' => $full]]);

        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'newcard.chance', 'value' => 'Je wint de loterij.', 'amount' => 100, 'photo' => BoxScenario::photo()])->assertCreated();
        // The Community Chest deck has 32 cards already (B135).
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'newcard.chest', 'value' => 'Nog een'])->assertUnprocessable();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'newcard.dice', 'value' => 'Nee'])->assertUnprocessable();

        $this->patchJson('/api/boxes/' . $box['id'], ['snapshot' => ['parts' => ['cards' => false]]], BoxScenario::owner($box['ownerSecret']))->assertOk();
        BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['elementKey' => 'newcard.chance', 'value' => 'Zonder kaarten'])->assertUnprocessable();

        self::assertSame(['newcard.chance'], BoxContribution::query()->pluck('element_key')->all());
    }
}
