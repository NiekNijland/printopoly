<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Models\PrintFile;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * "Drukkerij-set klaar tot 28 nov" on the cards of Mijn edities (B95): made files stay 7 days, and a user
 * only ever sees the print state of their own editions.
 */
final class EditionPrintReadyTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    #[Test]
    public function a_guest_gets_nothing(): void
    {
        $this->getJson('/api/print-ready')->assertUnauthorized();
    }

    #[Test]
    public function an_edition_without_files_is_not_listed(): void
    {
        $user = $this->createUser();
        $edition = $this->createEditionFor($user);
        $this->printJobFor($user, $edition);

        $this->actingAs($user)->getJson('/api/print-ready')->assertOk()->assertExactJson(['editions' => []]);
    }

    #[Test]
    public function a_finished_set_shows_when_its_first_file_goes_away(): void
    {
        $user = $this->createUser();
        $edition = $this->createEditionFor($user);
        $job = $this->printJobFor($user, $edition);

        $this->generate($job, 'printer', ['cards', 'money'])->assertOk();

        $first = PrintFile::query()->where('print_job_id', $job->publicId())->where('kind', 'part')->get()->min(
            static fn (PrintFile $file): int => $file->expires_at->getTimestampMs(),
        );

        $response = $this->getJson('/api/print-ready')->assertOk();

        $response->assertJsonCount(1, 'editions');
        $response->assertJsonPath('editions.0.editionId', $edition->edition_id);
        $response->assertJsonPath('editions.0.printerReadyUntil', $first);
        $response->assertJsonPath('editions.0.printerOutdated', false);
        $response->assertJsonPath('editions.0.homeReadyUntil', null);
    }

    #[Test]
    public function a_changed_edition_reads_as_outdated_and_not_ready(): void
    {
        $user = $this->createUser();
        $edition = $this->createEditionFor($user);
        $job = $this->printJobFor($user, $edition);

        $this->generate($job, 'printer', ['cards', 'money'])->assertOk();
        $edition->forceFill(['elements' => [...$edition->elements, 'note.5' => ['look' => 'rood']]])->save();

        $response = $this->getJson('/api/print-ready')->assertOk();

        $response->assertJsonPath('editions.0.printerReadyUntil', null);
        $response->assertJsonPath('editions.0.printerOutdated', true);
    }

    #[Test]
    public function another_user_sees_nothing_of_somebody_elses_files(): void
    {
        $owner = $this->createUser('owner@example.test');
        $intruder = $this->createUser('intruder@example.test');
        $edition = $this->createEditionFor($owner);
        $job = $this->printJobFor($owner, $edition);
        $this->generate($job, 'printer', ['cards'])->assertOk();

        $this->actingAs($intruder)->getJson('/api/print-ready')->assertOk()->assertExactJson(['editions' => []]);
    }
}
