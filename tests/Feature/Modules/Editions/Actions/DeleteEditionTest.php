<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\DeleteEdition;
use App\Modules\Editions\Events\EditionDeletedEvent;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class DeleteEditionTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_edition_is_gone_and_the_print_pipeline_hears_whose_it_was(): void
    {
        Event::fake([EditionDeletedEvent::class]);
        $user = User::factory()->create();
        $edition = Editions::store($user, 'zaterdagclub');
        $other = Editions::store($user, 'zondagclub');

        resolve(DeleteEdition::class)->handle($edition);

        self::assertNull(Edition::query()->where('edition_id', 'zaterdagclub')->first());
        self::assertNotNull(Edition::query()->where('edition_id', $other->edition_id)->first());
        Event::assertDispatchedTimes(EditionDeletedEvent::class, 1);
        Event::assertDispatched(EditionDeletedEvent::class, static fn (EditionDeletedEvent $event): bool => $event->userId === $user->publicId() && $event->editionId === 'zaterdagclub');
    }
}
