<?php

declare(strict_types=1);

namespace Tests\Feature\Boxes;

use App\Actions\Account\DeleteAccount;
use App\Actions\Editions\DeleteEdition;
use App\Boxes\BoxCleanup;
use App\Events\BoxActivity;
use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Models\Edition;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Response;
use Tests\Concerns\MakesEditions;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\TestImages;
use Tests\TestCase;

/**
 * "Samen maken" (B128): the owner makes a box, friends add to it through the link, and only the owner reads and
 * decides. A friend can add, never read what others added.
 */
final class BoxTest extends TestCase
{
    use MakesEditions;
    use RefreshesMongoDatabase;

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        config(['printopoly.storage.disk' => 'local']);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array{id: string, url: string, ownerSecret: string, token: string}
     */
    private function makeBox(array $overrides = []): array
    {
        $response = $this->postJson('/api/boxes', [
            'editionId' => 'edition-0001',
            'editionName' => 'Zaterdagclub',
            'language' => 'nl',
            'snapshot' => ['theme' => 'classic', 'currency' => 'eur', 'elements' => ['space.01' => ['name' => 'Molenweg'], 'card.chance.01' => ['text' => 'Ga naar start'], 'space.02' => ['photo' => ['photoId' => 'x']]]],
            ...$overrides,
        ]);
        $response->assertCreated();

        $url = $response->json('url');
        self::assertIsString($url);

        return [
            'id' => $this->text($response, 'id'),
            'url' => $url,
            'ownerSecret' => $this->text($response, 'ownerSecret'),
            'token' => basename($url),
        ];
    }

    /**
     * @param TestResponse<Response> $response
     */
    private function text(TestResponse $response, string $path): string
    {
        $value = $response->json($path);
        self::assertIsString($value);

        return $value;
    }

    /**
     * @param array<string, mixed> $fields
     * @return TestResponse<Response>
     */
    private function contribute(string $token, array $fields = []): TestResponse
    {
        return $this->post('/api/box/' . $token . '/contributions', [
            'elementKey' => 'space.01',
            'firstName' => 'Sanne',
            'value' => 'Kerkstraat',
            ...$fields,
        ], ['Accept' => 'application/json']);
    }

    private function photo(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('vakantie.jpg', TestImages::jpeg(800, 600));
    }

    /**
     * @return array<string, string>
     */
    private function owner(string $secret): array
    {
        return ['X-Box-Owner' => $secret];
    }

    #[Test]
    public function a_box_works_without_an_account_and_only_stores_a_snapshot_of_names(): void
    {
        $box = $this->makeBox();

        $stored = CollectionBox::query()->findOrFail($box['id']);
        self::assertNull($stored->user_id);
        self::assertSame(40, strlen($stored->token));
        self::assertNotSame($box['ownerSecret'], $stored->owner_hash, 'only a hash of the owner secret is stored');
        self::assertSame(['theme' => 'classic', 'currency' => 'eur', 'parts' => ['cards' => true, 'pawns' => false], 'elements' => ['space.01' => ['name' => 'Molenweg'], 'card.chance.01' => ['text' => 'Ga naar start']]], $stored->snapshot, 'photos and other fields are dropped');
        self::assertTrue($stored->expires_at->isAfter(CarbonImmutable::now()->addDays(29)));
        self::assertSame('/nl/box/' . $box['token'], parse_url($box['url'], PHP_URL_PATH));
    }

    #[Test]
    public function friends_open_the_link_without_an_account_and_see_the_names_but_not_the_secrets(): void
    {
        $box = $this->makeBox();

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

    #[Test]
    public function a_friend_adds_a_photo_and_a_name_with_their_first_name(): void
    {
        Event::fake([BoxActivity::class]);
        $box = $this->makeBox();

        $response = $this->contribute($box['token'], ['photo' => $this->photo()]);
        $response->assertCreated();
        self::assertSame(32, strlen($this->text($response, 'receipt')));
        Event::assertDispatched(BoxActivity::class, static fn (BoxActivity $event): bool => $event->pending === 1);

        $contribution = BoxContribution::query()->firstOrFail();
        self::assertSame('Sanne', $contribution->first_name);
        self::assertSame('Kerkstraat', $contribution->value);
        self::assertSame('space.01', $contribution->element_key);
        self::assertTrue(Storage::disk('local')->exists((string) $contribution->preview_path));
        self::assertTrue(Storage::disk('local')->exists((string) $contribution->print_path));
        self::assertStringStartsWith('box-photos/', (string) $contribution->print_path, 'private, on the configured disk');
    }

    #[Test]
    public function a_card_gets_a_text_and_a_pawn_a_name(): void
    {
        $box = $this->makeBox();

        $this->contribute($box['token'], ['elementKey' => 'card.chest.03', 'value' => 'Je krijgt taart van oma.'])->assertCreated();
        $this->contribute($box['token'], ['elementKey' => 'pawn.02', 'value' => 'Kees'])->assertCreated();

        self::assertSame(2, BoxContribution::query()->count());
    }

    #[Test]
    public function a_colour_group_takes_a_town_but_never_a_photo(): void
    {
        $box = $this->makeBox();

        $this->contribute($box['token'], ['elementKey' => 'group.brown', 'value' => 'Raalte'])->assertCreated();
        $this->contribute($box['token'], ['elementKey' => 'group.brown', 'value' => 'Heino', 'photo' => $this->photo()])->assertUnprocessable();
        $this->contribute($box['token'], ['elementKey' => 'group.purple', 'value' => 'Olst'])->assertUnprocessable();

        $id = (string) BoxContribution::query()->firstOrFail()->publicId();
        $this->getJson('/api/boxes/' . $box['id'], $this->owner($box['ownerSecret']))
            ->assertJsonPath('contributions.0.field', 'town')
            ->assertJsonPath('contributions.0.id', $id);
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    #[Test]
    public function a_friend_cannot_reach_what_is_not_theirs_to_add_to(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
        $box = $this->makeBox();

        foreach (['box_lid', 'board_center', 'bank', 'note.5', 'space.40', 'space.99', 'card.chance.17', 'pawn.09', 'deed.01', '../x'] as $key) {
            $this->contribute($box['token'], ['elementKey' => $key])->assertUnprocessable();
        }

        self::assertSame(0, BoxContribution::query()->count());
    }

    #[Test]
    public function a_contribution_needs_a_first_name_and_something_to_add(): void
    {
        $box = $this->makeBox();

        $this->contribute($box['token'], ['firstName' => ' '])->assertUnprocessable();
        $this->contribute($box['token'], ['value' => ''])->assertUnprocessable();
        $this->contribute($box['token'], ['value' => str_repeat('x', 41)])->assertUnprocessable();
        $this->contribute($box['token'], ['elementKey' => 'card.chance.02', 'value' => str_repeat('x', 201)])->assertUnprocessable();
    }

    #[Test]
    public function links_in_names_and_texts_are_refused(): void
    {
        $box = $this->makeBox();

        $this->contribute($box['token'], ['value' => 'Bezoek www.goedkoop.example'])->assertUnprocessable();
        $this->contribute($box['token'], ['value' => 'https://spam.example'])->assertUnprocessable();
        $this->contribute($box['token'], ['firstName' => 'koop.nl'])->assertUnprocessable();
        self::assertSame(0, BoxContribution::query()->count());
    }

    #[Test]
    public function the_honeypot_looks_like_success_but_stores_nothing(): void
    {
        $box = $this->makeBox();

        $this->contribute($box['token'], ['website' => 'https://bot.example'])->assertCreated();

        self::assertSame(0, BoxContribution::query()->count());
    }

    #[Test]
    public function photos_are_checked_like_every_other_upload(): void
    {
        $box = $this->makeBox();

        $text = UploadedFile::fake()->createWithContent('trucje.jpg', 'dit is geen foto');
        $this->contribute($box['token'], ['photo' => $text, 'value' => ''])->assertUnprocessable()->assertJsonValidationErrors('photo');

        $svg = UploadedFile::fake()->createWithContent('plaatje.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->contribute($box['token'], ['photo' => $svg, 'value' => ''])->assertUnprocessable();

        config(['printopoly.boxes.photo_max_megabytes' => 1]);
        $big = UploadedFile::fake()->create('groot.jpg', 2048, 'image/jpeg');
        $this->contribute($box['token'], ['photo' => $big, 'value' => ''])->assertUnprocessable();

        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    #[Test]
    public function a_closed_box_takes_nothing_more_and_an_expired_one_is_gone(): void
    {
        $box = $this->makeBox();
        $this->contribute($box['token'])->assertCreated();

        $this->postJson('/api/boxes/' . $box['id'] . '/close', [], $this->owner($box['ownerSecret']))->assertOk()->assertJsonPath('status', 'closed');
        $this->contribute($box['token'], ['value' => 'Nog een'])->assertStatus(409);
        $this->get('/nl/box/' . $box['token'])->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('box.status', 'closed'));
        $this->getJson('/api/boxes/' . $box['id'], $this->owner($box['ownerSecret']))->assertOk()->assertJsonCount(1, 'contributions');

        $this->travelTo(CarbonImmutable::now()->addDays(31));
        $this->contribute($box['token'])->assertNotFound();
        $this->get('/nl/box/' . $box['token'])->assertNotFound();
        $this->getJson('/api/boxes/' . $box['id'], $this->owner($box['ownerSecret']))->assertNotFound();
    }

    #[Test]
    public function the_box_is_full_after_the_configured_number_of_contributions_and_photos(): void
    {
        config(['printopoly.boxes.max_contributions' => 2, 'printopoly.boxes.max_photos' => 1]);
        $box = $this->makeBox();

        $this->contribute($box['token'], ['photo' => $this->photo()])->assertCreated();
        $this->contribute($box['token'], ['photo' => $this->photo(), 'value' => ''])->assertStatus(409);
        $this->contribute($box['token'])->assertCreated();
        $this->contribute($box['token'])->assertStatus(409);

        self::assertSame(2, BoxContribution::query()->count());
    }

    #[Test]
    public function adding_is_rate_limited_per_address(): void
    {
        $box = $this->makeBox();

        for ($i = 0; $i < 8; $i++) {
            $this->contribute($box['token'], ['value' => 'Naam ' . $i])->assertCreated();
        }

        $this->contribute($box['token'])->assertTooManyRequests();
    }

    #[Test]
    public function making_boxes_without_an_account_is_limited_per_address_and_day(): void
    {
        config(['printopoly.boxes.per_ip_per_day' => 2]);

        $this->makeBox();
        $this->makeBox();
        $this->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'X', 'snapshot' => []])->assertStatus(429);
    }

    #[Test]
    public function only_the_owner_secret_reads_the_contributions(): void
    {
        $box = $this->makeBox();
        $other = $this->makeBox(['editionId' => 'edition-0002']);
        $this->contribute($box['token'], ['photo' => $this->photo()])->assertCreated();
        $contribution = BoxContribution::query()->firstOrFail();

        $this->getJson('/api/boxes/' . $box['id'], $this->owner($box['ownerSecret']))
            ->assertOk()
            ->assertJsonPath('contributions.0.firstName', 'Sanne')
            ->assertJsonPath('contributions.0.value', 'Kerkstraat')
            ->assertJsonPath('contributions.0.hasPhoto', true)
            ->assertJsonMissingPath('contributions.0.receipt')
            ->assertJsonMissingPath('contributions.0.ip_hash');

        $photo = '/api/boxes/' . $box['id'] . '/contributions/' . $contribution->publicId() . '/photo';
        $this->get($photo, $this->owner($box['ownerSecret']))->assertOk()->assertHeader('Content-Type', 'image/jpeg');
        $this->get($photo . '?size=preview', $this->owner($box['ownerSecret']))->assertOk()->assertHeader('Content-Type', 'image/webp');

        // Nobody else: no secret, a wrong secret, the secret of another box, the friends' token.
        $this->getJson('/api/boxes/' . $box['id'])->assertNotFound();
        $this->getJson('/api/boxes/' . $box['id'], $this->owner('verkeerd'))->assertNotFound();
        $this->getJson('/api/boxes/' . $box['id'], $this->owner($other['ownerSecret']))->assertNotFound();
        $this->getJson('/api/boxes/' . $box['id'], $this->owner($box['token']))->assertNotFound();
        $this->getJson('/api/boxes/' . $box['token'])->assertNotFound();
        $this->get($photo)->assertNotFound();
        $this->get($photo, $this->owner($other['ownerSecret']))->assertNotFound();
        $this->get('/api/boxes/' . $other['id'] . '/contributions/' . $contribution->publicId() . '/photo', $this->owner($other['ownerSecret']))
            ->assertNotFound();
    }

    #[Test]
    public function the_friends_link_opens_nothing_of_the_owner_routes(): void
    {
        $box = $this->makeBox();
        $this->contribute($box['token'])->assertCreated();
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

    #[Test]
    public function a_friend_sees_only_their_own_receipts_and_their_own_photo(): void
    {
        $box = $this->makeBox();
        $mine = $this->text($this->contribute($box['token'], ['photo' => $this->photo()])->assertCreated(), 'receipt');
        $theirs = $this->text($this->contribute($box['token'], ['photo' => $this->photo(), 'value' => 'Anders'])->assertCreated(), 'receipt');
        $other = $this->makeBox(['editionId' => 'edition-0002']);

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

    #[Test]
    public function accepting_or_rejecting_deletes_the_contribution_and_its_photo(): void
    {
        $box = $this->makeBox();
        $this->contribute($box['token'], ['photo' => $this->photo()])->assertCreated();
        $this->contribute($box['token'], ['value' => 'Anders'])->assertCreated();
        [$first, $second] = BoxContribution::query()->orderBy('created_at')->get()->all();
        $headers = $this->owner($box['ownerSecret']);

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

    #[Test]
    public function a_new_link_replaces_the_old_one_and_keeps_the_contributions(): void
    {
        $box = $this->makeBox();
        $this->contribute($box['token'])->assertCreated();
        $this->postJson('/api/boxes/' . $box['id'] . '/close', [], $this->owner($box['ownerSecret']))->assertOk();

        $response = $this->postJson('/api/boxes/' . $box['id'] . '/renew', [], $this->owner($box['ownerSecret']))
            ->assertOk()
            ->assertJsonPath('status', 'open')
            ->assertJsonCount(1, 'contributions');
        $newToken = basename($this->text($response, 'url'));

        self::assertNotSame($box['token'], $newToken);
        $this->get('/nl/box/' . $box['token'])->assertNotFound();
        $this->contribute($box['token'])->assertNotFound();
        $this->get('/nl/box/' . $newToken)->assertOk();
        $this->contribute($newToken, ['value' => 'Weer open'])->assertCreated();
    }

    #[Test]
    public function the_owner_can_update_names_and_delete_the_box_with_everything_in_it(): void
    {
        $box = $this->makeBox();
        $this->contribute($box['token'], ['photo' => $this->photo()])->assertCreated();
        $headers = $this->owner($box['ownerSecret']);

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

    #[Test]
    public function a_box_made_while_logged_in_belongs_to_the_account_and_opens_on_another_device(): void
    {
        $user = User::factory()->create();
        $stranger = User::factory()->create();

        $made = $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'Eigen', 'snapshot' => []]);
        $made->assertCreated();
        $id = $this->text($made, 'id');
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
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/boxes?edition=edition-0001')->assertUnauthorized();
    }

    #[Test]
    public function deleting_the_edition_removes_its_boxes(): void
    {
        $user = User::factory()->create();
        $edition = $this->storeEdition($user, 'edition-0001');
        $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'A', 'snapshot' => []])->assertCreated();
        $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0002', 'editionName' => 'B', 'snapshot' => []])->assertCreated();
        $token = (string) CollectionBox::query()->where('edition_id', 'edition-0001')->firstOrFail()->token;
        $this->contribute($token, ['photo' => $this->photo()])->assertCreated();

        resolve(DeleteEdition::class)->handle($edition);

        self::assertSame(['edition-0002'], CollectionBox::query()->pluck('edition_id')->all());
        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    #[Test]
    public function deleting_the_account_removes_its_boxes_and_files(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'A', 'snapshot' => []])->assertCreated();
        $this->actingAs($other)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'Andere', 'snapshot' => []])->assertCreated();
        $token = (string) CollectionBox::query()->where('user_id', $user->publicId())->firstOrFail()->token;
        $this->contribute($token, ['photo' => $this->photo()])->assertCreated();

        resolve(DeleteAccount::class)->handle($user);

        self::assertSame(1, CollectionBox::query()->count());
        self::assertSame('Andere', CollectionBox::query()->firstOrFail()->edition_name);
        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
        self::assertNull(Edition::query()->where('user_id', $user->publicId())->first());
    }

    #[Test]
    public function the_cleanup_removes_boxes_thirty_days_after_the_last_activity(): void
    {
        $quiet = $this->makeBox();
        $busy = $this->makeBox(['editionId' => 'edition-0002']);
        $this->contribute($quiet['token'], ['photo' => $this->photo()])->assertCreated();

        $this->travelTo(CarbonImmutable::now()->addDays(20));
        $this->contribute($busy['token'], ['photo' => $this->photo()])->assertCreated();

        $this->travelTo(CarbonImmutable::now()->addDays(15));
        self::assertSame(0, Artisan::call('printopoly:cleanup-boxes'));
        self::assertStringContainsString('Removed 1 boxes and 1 contributions.', Artisan::output());

        self::assertNull(CollectionBox::query()->find($quiet['id']));
        self::assertNotNull(CollectionBox::query()->find($busy['id']), 'a contribution 15 days ago kept it alive');
        self::assertCount(2, Storage::disk('local')->allFiles(), 'only the photo of the box that is left');
    }

    #[Test]
    public function the_cleanup_also_removes_contributions_of_a_box_that_is_already_gone(): void
    {
        $box = $this->makeBox();
        $this->contribute($box['token'], ['photo' => $this->photo()])->assertCreated();
        CollectionBox::query()->where('_id', $box['id'])->delete();

        $counts = resolve(BoxCleanup::class)->run();

        self::assertSame(['boxes' => 0, 'contributions' => 1], $counts);
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    #[Test]
    public function the_cleanup_is_scheduled_daily(): void
    {
        $events = collect(resolve(Schedule::class)->events())
            ->filter(static fn (\Illuminate\Console\Scheduling\Event $event): bool => str_contains((string) $event->command, 'printopoly:cleanup-boxes'));

        self::assertCount(1, $events);
        self::assertSame('45 3 * * *', $events->first()?->expression);
    }

    #[Test]
    public function the_editor_hears_about_new_contributions_on_a_channel_only_the_owner_knows(): void
    {
        Event::fake([BoxActivity::class]);
        $box = $this->makeBox();
        $channel = $this->text($this->getJson('/api/boxes/' . $box['id'], $this->owner($box['ownerSecret'])), 'channel');

        $this->contribute($box['token'])->assertCreated();

        Event::assertDispatched(BoxActivity::class, function (BoxActivity $event) use ($channel): bool {
            self::assertSame($channel, $event->broadcastOn()->name);
            self::assertSame(['pending' => 1], $event->broadcastWith());

            return true;
        });
        self::assertStringStartsWith('box-owner.', $channel);
        self::assertStringNotContainsString($box['token'], $channel);
    }
}
