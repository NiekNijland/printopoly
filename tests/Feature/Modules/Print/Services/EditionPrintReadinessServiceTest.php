<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Services;

use App\Models\PrintFile;
use App\Models\User;
use App\Modules\Print\Data\EditionPrintReadyData;
use App\Modules\Print\Data\PrintJobReadyData;
use App\Modules\Print\Services\EditionPrintReadinessService;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class EditionPrintReadinessServiceTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_both_sets_of_an_edition_read_as_ready_until_their_first_file_goes(): void
    {
        $this->travelTo(now()->startOfSecond());
        $user = User::factory()->createOne();
        $edition = PrintScenario::createEditionFor($this, $user);
        $job = PrintScenario::printJobFor($this, $user, $edition);
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        $this->travel(1)->hours();
        PrintScenario::generate($this, $job, 'home', ['cards', 'money'])->assertOk();
        PrintFile::query()->where('print_job_id', $job->publicId())->where('set', 'home')->where('part', 'money')->update(['expires_at' => now()->addDays(3)->toDateTime()]);

        $ready = resolve(EditionPrintReadinessService::class)->forUser($user);

        self::assertCount(1, $ready);
        self::assertSame($edition->edition_id, $ready[0]->editionId);
        self::assertSame(now()->subHour()->addDays(7)->getTimestampMs(), $ready[0]->printerReadyUntil);
        self::assertSame(now()->addDays(3)->getTimestampMs(), $ready[0]->homeReadyUntil);
        self::assertFalse($ready[0]->printerOutdated);
        self::assertFalse($ready[0]->homeOutdated);
    }

    public function test_an_edition_whose_files_are_past_their_time_is_left_out(): void
    {
        $user = User::factory()->createOne();
        $job = PrintScenario::printJobFor($this, $user, PrintScenario::createEditionFor($this, $user));
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        $this->travel(8)->days();

        self::assertSame([], resolve(EditionPrintReadinessService::class)->forUser($user));
    }

    public function test_a_file_without_a_set_does_not_make_an_edition_ready(): void
    {
        $user = User::factory()->createOne();
        $job = PrintScenario::printJobFor($this, $user, PrintScenario::createEditionFor($this, $user));
        PrintFile::factory()->createOne(['print_job_id' => $job->publicId(), 'set' => null]);

        self::assertSame([], resolve(EditionPrintReadinessService::class)->forUser($user));
    }

    public function test_a_changed_edition_reads_as_outdated_in_the_set_that_was_made(): void
    {
        $user = User::factory()->createOne();
        $edition = PrintScenario::createEditionFor($this, $user);
        $job = PrintScenario::printJobFor($this, $user, $edition);
        PrintScenario::generate($this, $job, 'home', ['money'])->assertOk();
        $edition->forceFill(['elements' => [...$edition->elements, 'note.5' => ['color' => '#AA3322']]])->save();

        $ready = resolve(EditionPrintReadinessService::class)->forUser($user);

        self::assertCount(1, $ready);
        self::assertNull($ready[0]->homeReadyUntil);
        self::assertTrue($ready[0]->homeOutdated);
        self::assertNull($ready[0]->printerReadyUntil);
        self::assertFalse($ready[0]->printerOutdated);
    }

    public function test_no_tokens_is_no_answer(): void
    {
        self::assertSame([], resolve(EditionPrintReadinessService::class)->forTokens([], null));
    }

    public function test_tokens_answer_for_anonymous_jobs_and_for_the_jobs_of_the_user_only(): void
    {
        $this->travelTo(now()->startOfSecond());
        $anonymous = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $anonymous, 'home', ['cards'])->assertOk();
        $owner = User::factory()->createOne();
        $stranger = User::factory()->createOne();
        $owned = PrintScenario::printJobFor($this, $owner, PrintScenario::createEditionFor($this, $owner));
        PrintScenario::generate($this, $owned, 'printer', ['cards'])->assertOk();
        $tokens = [$anonymous->token, $owned->token, 'onbekend-token'];
        $service = resolve(EditionPrintReadinessService::class);

        $asGuest = $service->forTokens($tokens, null);
        $asStranger = $service->forTokens($tokens, $stranger);
        $asOwner = $service->forTokens($tokens, $owner);

        self::assertSame([$anonymous->token], array_map(static fn (PrintJobReadyData $row): string => $row->token, $asGuest));
        self::assertSame([$anonymous->token], array_map(static fn (PrintJobReadyData $row): string => $row->token, $asStranger));
        $tokensOfOwner = array_map(static fn (PrintJobReadyData $row): string => $row->token, $asOwner);
        sort($tokensOfOwner);
        $expected = [$anonymous->token, $owned->token];
        sort($expected);
        self::assertSame($expected, $tokensOfOwner);
        self::assertSame(now()->addDays(7)->getTimestampMs(), $asGuest[0]->homeReadyUntil);
        self::assertNull($asGuest[0]->printerReadyUntil);
    }

    public function test_each_edition_of_a_user_reads_the_files_of_its_own_job(): void
    {
        $this->travelTo(now()->startOfSecond());
        $user = User::factory()->createOne();
        $first = PrintScenario::createEditionFor($this, $user);
        $second = PrintScenario::createEditionFor($this, $user);
        $firstJob = PrintScenario::printJobFor($this, $user, $first);
        $secondJob = PrintScenario::printJobFor($this, $user, $second);
        PrintScenario::generate($this, $firstJob, 'printer', ['cards'])->assertOk();
        PrintScenario::generate($this, $secondJob, 'home', ['cards'])->assertOk();
        PrintFile::query()->where('print_job_id', $secondJob->publicId())->where('kind', PrintFile::KIND_PART)->update(['expires_at' => now()->addDays(2)->toDateTime()]);
        PrintFile::factory()->createOne(['print_job_id' => $firstJob->publicId(), 'kind' => PrintFile::KIND_IMAGE, 'set' => 'home', 'expires_at' => now()->addDay()->toImmutable()]);

        $ready = resolve(EditionPrintReadinessService::class)->forUser($user);
        $byEdition = array_combine(array_map(static fn (EditionPrintReadyData $row): string => $row->editionId, $ready), $ready);

        self::assertCount(2, $byEdition);
        self::assertSame(now()->addDays(7)->getTimestampMs(), $byEdition[$first->edition_id]->printerReadyUntil);
        self::assertNull($byEdition[$first->edition_id]->homeReadyUntil);
        self::assertNull($byEdition[$second->edition_id]->printerReadyUntil);
        self::assertSame(now()->addDays(2)->getTimestampMs(), $byEdition[$second->edition_id]->homeReadyUntil);
    }
}
