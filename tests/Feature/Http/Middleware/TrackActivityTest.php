<?php

declare(strict_types=1);

namespace Tests\Feature\Http\Middleware;

use App\Models\User;
use Carbon\CarbonImmutable;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class TrackActivityTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_page_view_of_a_logged_in_user_records_the_activity(): void
    {
        $user = User::factory()->create(['last_active_at' => CarbonImmutable::now()->subDays(40)]);

        $this->actingAs($user)->get('/nl/editions')->assertOk();

        $fresh = User::query()->whereKey($user->getKey())->firstOrFail();
        self::assertNotNull($fresh->last_active_at);
        self::assertSame(now()->getTimestamp(), $fresh->last_active_at->getTimestamp());
    }

    public function test_a_guest_records_nothing(): void
    {
        $user = User::factory()->create(['last_active_at' => CarbonImmutable::now()->subDays(40)]);

        $this->get('/nl/editions')->assertOk();

        $fresh = User::query()->whereKey($user->getKey())->firstOrFail();
        self::assertSame(now()->subDays(40)->getTimestamp(), $fresh->last_active_at?->getTimestamp());
    }
}
