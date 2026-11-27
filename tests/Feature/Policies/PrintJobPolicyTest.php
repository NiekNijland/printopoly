<?php

declare(strict_types=1);

namespace Tests\Feature\Policies;

use App\Models\PrintJob;
use App\Models\User;
use App\Policies\PrintJobPolicy;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class PrintJobPolicyTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_job_without_an_account_opens_for_whoever_holds_its_link(): void
    {
        $job = PrintJob::factory()->createOne(['user_id' => null]);
        $policy = new PrintJobPolicy();

        self::assertTrue($policy->view(null, $job));
        self::assertTrue($policy->view(User::factory()->createOne(), $job));
        self::assertTrue($policy->addPhotos(null, $job)->allowed());
    }

    public function test_a_job_of_an_account_opens_for_that_account_alone_and_takes_no_photos_by_its_link(): void
    {
        $owner = User::factory()->createOne();
        $job = PrintJob::factory()->createOne(['user_id' => $owner->publicId()]);
        $policy = new PrintJobPolicy();

        self::assertTrue($policy->view($owner, $job));
        self::assertFalse($policy->view(User::factory()->createOne(), $job));
        self::assertFalse($policy->view(null, $job));
        self::assertSame(404, $policy->addPhotos($owner, $job)->status());
    }
}
