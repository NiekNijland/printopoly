<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Models\PrintFile;
use App\Models\PrintJob;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * "Drukkerij-set klaar tot …" on Mijn edities without an account: the browser presents the tokens it kept next to
 * its editions, and only gets an answer for jobs it may open. Nothing is ever listed.
 */
final class PrintJobReadyTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    #[Test]
    public function a_made_set_of_an_anonymous_job_reads_as_ready_by_its_token(): void
    {
        $job = $this->createAnonymousJob();
        $this->generate($job, 'printer', ['cards'])->assertOk();

        $first = PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', 'part')->get()->min(
            static fn (PrintFile $file): int => $file->expires_at->getTimestampMs(),
        );

        $response = $this->postJson('/api/print-jobs/ready', ['tokens' => [$job->token]])->assertOk();

        $response->assertHeader('Cache-Control', 'no-store, private');
        $response->assertExactJson(['jobs' => [[
            'token' => $job->token,
            'printerReadyUntil' => $first,
            'printerOutdated' => false,
            'homeReadyUntil' => null,
            'homeOutdated' => false,
        ]]]);
    }

    #[Test]
    public function an_unknown_token_and_a_job_without_files_are_left_out(): void
    {
        $job = $this->createAnonymousJob();

        $this->postJson('/api/print-jobs/ready', ['tokens' => [Str::random(40), $job->token]])
            ->assertOk()
            ->assertExactJson(['jobs' => []]);
    }

    #[Test]
    public function only_the_tokens_that_were_sent_are_answered(): void
    {
        $one = $this->createAnonymousJob();
        $other = $this->createAnonymousJob();
        $this->generate($one, 'printer', ['cards'])->assertOk();
        $this->generate($other, 'printer', ['cards'])->assertOk();

        $response = $this->postJson('/api/print-jobs/ready', ['tokens' => [$one->token]])->assertOk();

        $response->assertJsonCount(1, 'jobs');
        $response->assertJsonPath('jobs.0.token', $one->token);
        $this->postJson('/api/print-jobs/ready', ['tokens' => []])->assertOk()->assertExactJson(['jobs' => []]);
    }

    #[Test]
    public function the_job_of_an_account_is_not_shown_to_a_guest_or_another_user(): void
    {
        $owner = $this->createUser('owner@example.test');
        $intruder = $this->createUser('intruder@example.test');
        $job = $this->printJobFor($owner, $this->createEditionFor($owner));
        $this->actingAs($owner);
        $this->generate($job, 'printer', ['cards'])->assertOk();

        $this->actingAs($intruder)
            ->postJson('/api/print-jobs/ready', ['tokens' => [$job->token]])
            ->assertOk()
            ->assertExactJson(['jobs' => []]);

        $this->app?->make('auth')->guard()->logout();
        $this->postJson('/api/print-jobs/ready', ['tokens' => [$job->token]])
            ->assertOk()
            ->assertExactJson(['jobs' => []]);

        $this->actingAs($owner)
            ->postJson('/api/print-jobs/ready', ['tokens' => [$job->token]])
            ->assertOk()
            ->assertJsonPath('jobs.0.token', $job->token);
    }

    #[Test]
    public function it_refuses_anything_that_is_not_a_list_of_tokens(): void
    {
        $this->postJson('/api/print-jobs/ready', [])->assertUnprocessable();
        $this->postJson('/api/print-jobs/ready', ['tokens' => ['../../etc']])->assertUnprocessable();
        $this->postJson('/api/print-jobs/ready', ['tokens' => [['$ne' => null]]])->assertUnprocessable();
        $this->postJson('/api/print-jobs/ready', [
            'tokens' => array_map(static fn (): string => Str::random(40), range(1, 51)),
        ])->assertUnprocessable();
        $this->assertSame(0, PrintJob::query()->count());
    }
}
