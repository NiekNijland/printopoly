<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\DuplicateEdition;
use App\Modules\Editions\Events\EditionDuplicatedEvent;
use App\Modules\Editions\Exceptions\EditionLimitReachedException;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class DuplicateEditionTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_copy_gets_its_own_id_revision_zero_and_a_dutch_suffix(): void
    {
        Event::fake([EditionDuplicatedEvent::class]);
        $user = User::factory()->create();
        $source = Editions::store($user, 'zaterdagclub', [
            'revision' => 5,
            'template' => 'village',
            'moneyAmount' => 'four',
            'elements' => ['space.01' => ['name' => 'Molenweg']],
        ]);

        $copy = resolve(DuplicateEdition::class)->handle($user, $source);

        self::assertNotSame('zaterdagclub', $copy->edition_id);
        self::assertSame('Zaterdagclub (kopie)', $copy->name);
        self::assertSame(0, $copy->revision);
        self::assertSame($user->publicId(), $copy->user_id);
        self::assertSame('village', $copy->template);
        self::assertSame('four', $copy->money_amount);
        self::assertSame(['space.01' => ['name' => 'Molenweg']], $copy->elements);
        self::assertGreaterThan(1_000, $copy->created_at_ms);
        self::assertSame($copy->created_at_ms, $copy->updated_at_ms);
        self::assertSame(5, $source->refresh()->revision);
        Event::assertDispatched(EditionDuplicatedEvent::class, static fn (EditionDuplicatedEvent $event): bool => $event->userId === $user->publicId()
            && $event->sourceId === 'zaterdagclub'
            && $event->copyId === $copy->edition_id);
    }

    public function test_an_english_edition_gets_copy_and_a_given_name_wins(): void
    {
        Event::fake([EditionDuplicatedEvent::class]);
        $user = User::factory()->create();
        $source = Editions::store($user, 'saturday', ['name' => 'Saturday club', 'language' => 'en']);

        $suffixed = resolve(DuplicateEdition::class)->handle($user, $source);
        $named = resolve(DuplicateEdition::class)->handle($user, $source, 'Sunday club');

        self::assertSame('Saturday club (copy)', $suffixed->name);
        self::assertSame('Sunday club', $named->name);
        self::assertNull($named->template);
        self::assertNull($named->money_amount);
    }

    public function test_a_full_account_gets_no_copy_and_no_event(): void
    {
        Event::fake([EditionDuplicatedEvent::class]);
        config(['printopoly.limits.editions_per_account' => 1]);
        $user = User::factory()->create();
        $source = Editions::store($user, 'zaterdagclub');

        try {
            resolve(DuplicateEdition::class)->handle($user, $source);
            self::fail('The copy went past the limit.');
        } catch (EditionLimitReachedException $editionLimitReachedException) {
            self::assertSame(1, $editionLimitReachedException->limit);
        }

        self::assertSame(1, Edition::query()->count());
        Event::assertNotDispatched(EditionDuplicatedEvent::class);
    }
}
