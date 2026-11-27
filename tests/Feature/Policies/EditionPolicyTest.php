<?php

declare(strict_types=1);

namespace Tests\Feature\Policies;

use App\Models\Edition;
use App\Models\User;
use App\Policies\EditionPolicy;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class EditionPolicyTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_owner_may_view_change_print_and_delete_an_edition(): void
    {
        $owner = User::factory()->createOne();
        $edition = Edition::factory()->createOne(['user_id' => $owner->publicId()]);
        $policy = new EditionPolicy();

        self::assertTrue($policy->view($owner, $edition)->allowed());
        self::assertTrue($policy->update($owner, $edition)->allowed());
        self::assertTrue($policy->print($owner, $edition)->allowed());
        self::assertTrue($policy->delete($owner, $edition)->allowed());
    }

    public function test_someone_else_finds_no_edition_at_all(): void
    {
        $edition = Edition::factory()->createOne(['user_id' => User::factory()->createOne()->publicId()]);
        $intruder = User::factory()->createOne();
        $policy = new EditionPolicy();

        foreach ([$policy->view($intruder, $edition), $policy->update($intruder, $edition), $policy->print($intruder, $edition), $policy->delete($intruder, $edition)] as $response) {
            self::assertTrue($response->denied());
            self::assertSame(404, $response->status());
        }
    }
}
