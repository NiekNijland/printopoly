<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\Edition;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Support\EditionPrintJobs;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class EditionPrintJobsTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_first_print_of_an_edition_makes_an_empty_job_in_the_language_of_the_site(): void
    {
        $user = User::factory()->createOne();
        $edition = Edition::factory()->createOne(['user_id' => $user->publicId(), 'edition_id' => 'zaterdagclub']);

        $job = resolve(EditionPrintJobs::class)->forEdition($user, $edition, Locale::ENGLISH);

        $stored = PrintJob::query()->whereKey($job->getKey())->firstOrFail();
        self::assertSame($user->publicId(), $stored->user_id);
        self::assertSame('zaterdagclub', $stored->edition_id);
        self::assertNull($stored->edition);
        self::assertSame('en', $stored->locale);
        self::assertSame(40, mb_strlen($stored->token, '8bit'));
        self::assertNull($stored->active_at);
    }

    public function test_the_same_edition_gets_the_same_job_and_takes_the_language_of_the_site(): void
    {
        $user = User::factory()->createOne();
        $edition = Edition::factory()->createOne(['user_id' => $user->publicId(), 'edition_id' => 'zaterdagclub']);
        $jobs = resolve(EditionPrintJobs::class);
        $first = $jobs->forEdition($user, $edition, Locale::DUTCH);

        $second = $jobs->forEdition($user, $edition, Locale::ENGLISH);

        self::assertSame($first->getKey(), $second->getKey());
        self::assertSame($first->token, $second->token);
        self::assertSame(1, PrintJob::query()->count());
        self::assertSame('en', $first->refresh()->locale);
    }

    public function test_a_busy_job_keeps_its_language(): void
    {
        $user = User::factory()->createOne();
        $edition = Edition::factory()->createOne(['user_id' => $user->publicId(), 'edition_id' => 'zaterdagclub']);
        $busy = PrintJob::factory()->createOne(['user_id' => $user->publicId(), 'edition_id' => 'zaterdagclub', 'locale' => 'nl', 'active_at' => now()]);

        $job = resolve(EditionPrintJobs::class)->forEdition($user, $edition, Locale::ENGLISH);

        self::assertSame($busy->getKey(), $job->getKey());
        self::assertSame('nl', $busy->refresh()->locale);
    }

    public function test_another_user_or_another_edition_gets_its_own_job(): void
    {
        $anna = User::factory()->createOne();
        $bob = User::factory()->createOne();
        $annasEdition = Edition::factory()->createOne(['user_id' => $anna->publicId(), 'edition_id' => 'molenweg']);
        $annasOther = Edition::factory()->createOne(['user_id' => $anna->publicId(), 'edition_id' => 'kerkstraat']);
        $bobsEdition = Edition::factory()->createOne(['user_id' => $bob->publicId(), 'edition_id' => 'molenweg']);
        $jobs = resolve(EditionPrintJobs::class);

        $first = $jobs->forEdition($anna, $annasEdition, Locale::DUTCH);
        $other = $jobs->forEdition($anna, $annasOther, Locale::DUTCH);
        $bobs = $jobs->forEdition($bob, $bobsEdition, Locale::DUTCH);

        self::assertNotSame($first->getKey(), $other->getKey());
        self::assertNotSame($first->getKey(), $bobs->getKey());
        self::assertSame($bob->publicId(), $bobs->user_id);
        self::assertSame(3, PrintJob::query()->count());
    }
}
