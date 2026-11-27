<?php

declare(strict_types=1);

namespace Tests\Feature\Policies;

use App\Models\Asset;
use App\Models\User;
use App\Policies\AssetPolicy;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class AssetPolicyTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_only_the_owner_may_view_a_photo(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $asset = Asset::factory()->createOne(['user_id' => $owner->publicId(), 'edition_id' => 'zaterdagclub']);
        $policy = new AssetPolicy();

        self::assertTrue($policy->view($owner, $asset));
        self::assertFalse($policy->view($other, $asset));
    }

    public function test_a_photo_of_an_anonymous_job_is_never_served_by_id(): void
    {
        $user = User::factory()->create();
        $asset = Asset::factory()->createOne(['user_id' => null, 'print_job_id' => 'anoniem']);

        self::assertFalse(new AssetPolicy()->view($user, $asset));
    }

    public function test_another_account_is_refused_the_preview_link(): void
    {
        $owner = User::factory()->create();
        $asset = Asset::factory()->createOne(['user_id' => $owner->publicId()]);

        $this->actingAs(User::factory()->create())
            ->getJson(route('api.assets.preview', ['asset' => $asset]))
            ->assertForbidden();
    }
}
