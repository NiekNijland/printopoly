<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Models\User;
use App\Modules\Boxes\Events\BoxActivityEvent;
use Illuminate\Contracts\Auth\Factory;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\Support\BoxScenario;
use Tests\TestCase;

final class BoxOwnerTest extends TestCase
{
    use RefreshesMongoDatabase;
    use UsesLocalBoxDisk;

    public function test_only_the_owner_secret_reads_the_contributions(): void
    {
        $box = BoxScenario::makeBox($this);
        $other = BoxScenario::makeBox($this, ['editionId' => 'edition-0002']);
        BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo()])->assertCreated();
        $contribution = BoxContribution::query()->firstOrFail();

        $this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner($box['ownerSecret']))
            ->assertOk()
            ->assertJsonPath('contributions.0.firstName', 'Sanne')
            ->assertJsonPath('contributions.0.value', 'Kerkstraat')
            ->assertJsonPath('contributions.0.hasPhoto', true)
            ->assertJsonMissingPath('contributions.0.receipt')
            ->assertJsonMissingPath('contributions.0.ip_hash');

        $photo = '/api/boxes/' . $box['id'] . '/contributions/' . $contribution->publicId() . '/photo';
        $this->get($photo, BoxScenario::owner($box['ownerSecret']))->assertOk()->assertHeader('Content-Type', 'image/jpeg');
        $this->get($photo . '?size=preview', BoxScenario::owner($box['ownerSecret']))->assertOk()->assertHeader('Content-Type', 'image/webp');

        // Nobody else: no secret, a wrong secret, the secret of another box, the friends' token.
        $this->getJson('/api/boxes/' . $box['id'])->assertNotFound();
        $this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner('verkeerd'))->assertNotFound();
        $this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner($other['ownerSecret']))->assertNotFound();
        $this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner($box['token']))->assertNotFound();
        $this->getJson('/api/boxes/' . $box['token'])->assertNotFound();
        $this->get($photo)->assertNotFound();
        $this->get($photo, BoxScenario::owner($other['ownerSecret']))->assertNotFound();
        $this->get('/api/boxes/' . $other['id'] . '/contributions/' . $contribution->publicId() . '/photo', BoxScenario::owner($other['ownerSecret']))
            ->assertNotFound();
    }

    public function test_the_friends_link_opens_nothing_of_the_owner_routes(): void
    {
        $box = BoxScenario::makeBox($this);
        BoxScenario::contribute($this, $box['token'])->assertCreated();
        $contribution = BoxContribution::query()->firstOrFail();
        $base = '/api/boxes/' . $box['id'];

        $this->patchJson($base, ['editionName' => 'Gekaapt'])->assertNotFound();
        $this->postJson($base . '/close')->assertNotFound();
        $this->postJson($base . '/renew')->assertNotFound();
        $this->postJson($base . '/contributions/' . $contribution->publicId() . '/resolve', ['decision' => 'accept'])->assertNotFound();
        $this->deleteJson($base)->assertNotFound();

        self::assertSame('open', CollectionBox::query()->findOrFail($box['id'])->status);
        self::assertSame('Zaterdagclub', CollectionBox::query()->findOrFail($box['id'])->edition_name);
        self::assertSame(1, BoxContribution::query()->count());
    }

    public function test_a_friend_sees_only_their_own_receipts_and_their_own_photo(): void
    {
        $box = BoxScenario::makeBox($this);
        $mine = BoxScenario::text(BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo()])->assertCreated(), 'receipt');
        $theirs = BoxScenario::text(BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo(), 'value' => 'Anders'])->assertCreated(), 'receipt');
        $other = BoxScenario::makeBox($this, ['editionId' => 'edition-0002']);

        $this->get('/api/box/' . $box['token'] . '/mine/' . $mine . '/photo')->assertOk()->assertHeader('Content-Type', 'image/webp');
        $this->get('/api/box/' . $other['token'] . '/mine/' . $mine . '/photo')->assertNotFound();
        $this->get('/api/box/' . $box['token'] . '/mine/' . str_repeat('x', 32) . '/photo')->assertNotFound();

        // Ids and the owner's route are no way in for a friend.
        $id = BoxContribution::query()->firstOrFail()->publicId();
        $this->get('/api/box/' . $box['token'] . '/mine/' . $id . '/photo')->assertNotFound();
        $this->get('/api/boxes/' . $box['id'] . '/contributions/' . $id . '/photo')->assertNotFound();

        $this->getJson('/api/box/' . $box['token'] . '/mine?receipts[]=' . $mine . '&receipts[]=' . str_repeat('z', 32))
            ->assertOk()
            ->assertExactJson(['contributions' => [$mine => 'waiting', str_repeat('z', 32) => 'handled']]);
        self::assertNotSame($mine, $theirs);
    }

    public function test_accepting_or_rejecting_deletes_the_contribution_and_its_photo(): void
    {
        $box = BoxScenario::makeBox($this);
        BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo()])->assertCreated();
        BoxScenario::contribute($this, $box['token'], ['value' => 'Anders', 'elementKey' => 'space.03'])->assertCreated();
        [$first, $second] = BoxContribution::query()->oldest()->get()->all();
        $headers = BoxScenario::owner($box['ownerSecret']);

        self::assertNotEmpty(Storage::disk('local')->allFiles());

        $this->postJson('/api/boxes/' . $box['id'] . '/contributions/' . $first->publicId() . '/resolve', ['decision' => 'accept'], $headers)
            ->assertOk()
            ->assertJsonPath('accepted', 1)
            ->assertJsonCount(1, 'contributions');
        self::assertSame([], Storage::disk('local')->allFiles());

        $this->postJson('/api/boxes/' . $box['id'] . '/contributions/' . $second->publicId() . '/resolve', ['decision' => 'reject'], $headers)
            ->assertOk()
            ->assertJsonPath('rejected', 1)
            ->assertJsonCount(0, 'contributions');
        $this->postJson('/api/boxes/' . $box['id'] . '/contributions/' . $second->publicId() . '/resolve', ['decision' => 'reject'], $headers)->assertNotFound();
        $this->postJson('/api/boxes/' . $box['id'] . '/contributions/' . $first->publicId() . '/resolve', ['decision' => 'maybe'], $headers)->assertUnprocessable();
    }

    public function test_a_new_link_replaces_the_old_one_and_keeps_the_contributions(): void
    {
        $box = BoxScenario::makeBox($this);
        BoxScenario::contribute($this, $box['token'])->assertCreated();
        $this->postJson('/api/boxes/' . $box['id'] . '/close', [], BoxScenario::owner($box['ownerSecret']))->assertOk();

        $response = $this->postJson('/api/boxes/' . $box['id'] . '/renew', [], BoxScenario::owner($box['ownerSecret']))
            ->assertOk()
            ->assertJsonPath('status', 'open')
            ->assertJsonCount(1, 'contributions');
        $newToken = basename(BoxScenario::text($response, 'url'));

        self::assertNotSame($box['token'], $newToken);
        BoxScenario::contribute($this, $box['token'])->assertGone()->assertJsonPath('errors.box.0', __('boxes.replaced'));
        $this->get('/nl/box/' . $newToken)->assertOk();
        BoxScenario::contribute($this, $newToken, ['value' => 'Weer open'])->assertCreated();
    }

    public function test_an_old_link_says_it_was_replaced_and_shows_nothing_of_the_edition(): void
    {
        $box = BoxScenario::makeBox($this);
        $this->postJson('/api/boxes/' . $box['id'] . '/renew', [], BoxScenario::owner($box['ownerSecret']))->assertOk();

        // Bug 19 of round 3: the old link was a bare 404.
        $this->get('/nl/box/' . $box['token'])->assertOk()->assertInertia(
            fn (AssertableInertia $page): AssertableInertia => $page
                ->component('boxes/show')
                ->where('box.status', 'replaced')
                ->where('box.token', '')
                ->where('box.editionName', 'Zaterdagclub')
                ->has('box.snapshot.elements', 0),
        );
        self::assertStringNotContainsString('Molenweg', (string) $this->get('/nl/box/' . $box['token'])->getContent());
        $this->get('/nl/box/' . str_repeat('Q', 40))->assertNotFound();
    }

    public function test_applying_one_part_passes_over_the_same_part_of_the_others_and_the_friend_sees_what_became_of_it(): void
    {
        $friend = 0;
        $box = BoxScenario::makeBox($this);
        $pim = BoxScenario::text(BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['firstName' => 'Pim', 'value' => 'Kerkstraat', 'photo' => BoxScenario::photo()])->assertCreated(), 'receipt');
        $maya = BoxScenario::text(BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['firstName' => 'Maya', 'value' => 'Dorpsstraat'])->assertCreated(), 'receipt');
        $daan = BoxScenario::text(BoxScenario::contributeFrom($this, ++$friend, $box['token'], ['firstName' => 'Daan', 'photo' => BoxScenario::photo()])->assertCreated(), 'receipt');
        [$first, $second, $third] = BoxContribution::query()->oldest()->get()->all();
        $headers = BoxScenario::owner($box['ownerSecret']);
        $url = '/api/boxes/' . $box['id'] . '/contributions/';

        // Maya's name goes in: Pim's name is passed over, his photo still waits; Daan's photo is untouched.
        $this->postJson($url . $second->publicId() . '/resolve', ['decision' => 'accept', 'parts' => ['name']], $headers)
            ->assertOk()
            ->assertJsonCount(2, 'contributions')
            ->assertJsonPath('contributions.0.id', $first->publicId())
            ->assertJsonPath('contributions.0.open', ['photo'])
            ->assertJsonPath('contributions.1.open', ['photo'])
            ->assertJsonPath('accepted', 1);

        // Daan's photo goes in: Pim's photo is passed over too, and nothing of his went in.
        $this->postJson($url . $third->publicId() . '/resolve', ['decision' => 'accept', 'parts' => ['photo']], $headers)
            ->assertOk()
            ->assertJsonCount(0, 'contributions')
            ->assertJsonPath('accepted', 2)
            ->assertJsonPath('rejected', 1);
        self::assertSame([], Storage::disk('local')->allFiles());

        $this->getJson('/api/box/' . $box['token'] . '/mine?receipts[]=' . $pim . '&receipts[]=' . $maya . '&receipts[]=' . $daan)
            ->assertExactJson(['contributions' => [$pim => 'passed', $maya => 'applied', $daan => 'applied']]);
    }

    public function test_the_owner_can_keep_the_card_texts_from_friends(): void
    {
        $box = BoxScenario::makeBox($this, ['snapshot' => ['elements' => [
            'space.01' => ['name' => 'Molenweg'],
            'card.chance.01' => ['text' => 'Geheime grap over Lina'],
            'card.chance.17' => ['added' => true, 'text' => 'Nog een geheim'],
        ]]]);

        $this->patchJson('/api/boxes/' . $box['id'], ['cardsHidden' => true], BoxScenario::owner($box['ownerSecret']))
            ->assertOk()
            ->assertJsonPath('cardsHidden', true);

        $page = $this->get('/nl/box/' . $box['token'])->assertOk();
        $page->assertInertia(
            fn (AssertableInertia $inertia): AssertableInertia => $inertia
                ->where('box.snapshot.cardsHidden', true)
                ->where('box.snapshot.elements', static fn (mixed $elements): bool => json_encode($elements) === json_encode([
                    'space.01' => ['name' => 'Molenweg'],
                    'card.chance.17' => ['added' => true],
                ])),
        );
        self::assertStringNotContainsString('Geheime grap', (string) $page->getContent());
        self::assertStringNotContainsString('Nog een geheim', (string) $page->getContent());

        // Friends can still propose a text, also for the extra card.
        BoxScenario::contribute($this, $box['token'], ['elementKey' => 'card.chance.17', 'value' => 'Lina wint'])->assertCreated();

        $this->patchJson('/api/boxes/' . $box['id'], ['cardsHidden' => false], BoxScenario::owner($box['ownerSecret']))->assertOk();
        self::assertStringContainsString('Geheime grap over Lina', (string) $this->get('/nl/box/' . $box['token'])->getContent());
    }

    public function test_rejecting_one_part_keeps_the_rest_waiting(): void
    {
        $box = BoxScenario::makeBox($this);
        BoxScenario::contribute($this, $box['token'], ['value' => 'Kerkstraat', 'photo' => BoxScenario::photo()])->assertCreated();
        $contribution = BoxContribution::query()->firstOrFail();

        $this->postJson('/api/boxes/' . $box['id'] . '/contributions/' . $contribution->publicId() . '/resolve', ['decision' => 'reject', 'parts' => ['photo']], BoxScenario::owner($box['ownerSecret']))
            ->assertOk()
            ->assertJsonPath('contributions.0.open', ['name']);
        $this->postJson('/api/boxes/' . $box['id'] . '/contributions/' . $contribution->publicId() . '/resolve', ['decision' => 'reject', 'parts' => ['dice']], BoxScenario::owner($box['ownerSecret']))
            ->assertUnprocessable();
    }

    public function test_the_owner_can_update_names_and_delete_the_box_with_everything_in_it(): void
    {
        $box = BoxScenario::makeBox($this);
        BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo()])->assertCreated();
        $headers = BoxScenario::owner($box['ownerSecret']);

        $this->patchJson('/api/boxes/' . $box['id'], ['editionName' => 'Nieuwe naam', 'snapshot' => ['elements' => ['space.03' => ['name' => 'Havenplein']]]], $headers)
            ->assertOk();
        $stored = CollectionBox::query()->findOrFail($box['id']);
        self::assertSame('Nieuwe naam', $stored->edition_name);
        self::assertSame(['space.03' => ['name' => 'Havenplein']], $stored->snapshot['elements']);

        $this->deleteJson('/api/boxes/' . $box['id'], [], $headers)->assertNoContent();

        self::assertSame(0, CollectionBox::query()->count());
        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
        $this->get('/nl/box/' . $box['token'])->assertNotFound();
    }

    public function test_a_box_made_while_logged_in_belongs_to_the_account_and_opens_on_another_device(): void
    {
        $user = User::factory()->create();
        $stranger = User::factory()->create();

        $made = $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'Eigen', 'snapshot' => []]);
        $made->assertCreated();

        $id = BoxScenario::text($made, 'id');
        self::assertSame($user->publicId(), CollectionBox::query()->findOrFail($id)->user_id);

        // A second device has no owner secret but the account.
        $this->actingAs($user)->getJson('/api/boxes?edition=edition-0001')->assertOk()->assertJsonPath('box.id', $id);
        $this->actingAs($user)->getJson('/api/boxes/' . $id)->assertOk();
        // Making it again gives the same box.
        $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'Eigen', 'snapshot' => []])
            ->assertOk()
            ->assertJsonPath('id', $id)
            ->assertJsonMissingPath('ownerSecret');
        self::assertSame(1, CollectionBox::query()->count());

        // Another account sees nothing of it.
        $this->actingAs($stranger)->getJson('/api/boxes?edition=edition-0001')->assertOk()->assertJsonPath('box', null);
        $this->actingAs($stranger)->getJson('/api/boxes/' . $id)->assertNotFound();
        $this->actingAs($stranger)->deleteJson('/api/boxes/' . $id)->assertNotFound();
        $this->app->make(Factory::class)->forgetGuards();
        $this->getJson('/api/boxes?edition=edition-0001')->assertUnauthorized();
    }

    public function test_the_editor_hears_about_new_contributions_on_a_channel_only_the_owner_knows(): void
    {
        Event::fake([BoxActivityEvent::class]);
        $box = BoxScenario::makeBox($this);
        $channel = BoxScenario::text($this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner($box['ownerSecret'])), 'channel');

        BoxScenario::contribute($this, $box['token'])->assertCreated();

        Event::assertDispatched(BoxActivityEvent::class, function (BoxActivityEvent $event) use ($channel): bool {
            self::assertSame($channel, $event->broadcastOn()->name);
            self::assertSame(['pending' => 1], $event->broadcastWith());

            return true;
        });
        self::assertStringStartsWith('box-owner.', $channel);
        self::assertStringNotContainsString($box['token'], $channel);
    }
}
