<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Models\PrintFile;
use App\Models\User;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

/**
 * "Drukkerij-set klaar tot 28 nov" on the cards of Mijn edities (B95): made files stay 7 days, and a user
 * only ever sees the print state of their own editions.
 */
final class EditionPrintReadyTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_a_guest_gets_nothing(): void
    {
        $this->getJson('/api/print-ready')->assertUnauthorized();
    }

    public function test_an_edition_without_files_is_not_listed(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);
        PrintScenario::printJobFor($this, $user, $edition);

        $this->actingAs($user)->getJson('/api/print-ready')->assertOk()->assertExactJson(['editions' => []]);
    }

    public function test_a_finished_set_shows_when_its_first_file_goes_away(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);
        $job = PrintScenario::printJobFor($this, $user, $edition);

        PrintScenario::generate($this, $job, 'printer', ['cards', 'money'])->assertOk();

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

    public function test_a_changed_edition_reads_as_outdated_and_not_ready(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);
        $job = PrintScenario::printJobFor($this, $user, $edition);

        PrintScenario::generate($this, $job, 'printer', ['cards', 'money'])->assertOk();
        $edition->forceFill(['elements' => [...$edition->elements, 'note.5' => ['color' => '#AA3322']]])->save();

        $response = $this->getJson('/api/print-ready')->assertOk();

        $response->assertJsonPath('editions.0.printerReadyUntil', null);
        $response->assertJsonPath('editions.0.printerOutdated', true);
    }

    public function test_another_user_sees_nothing_of_somebody_elses_files(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.test']);
        $intruder = User::factory()->create(['email' => 'intruder@example.test']);
        $edition = PrintScenario::createEditionFor($this, $owner);
        $job = PrintScenario::printJobFor($this, $owner, $edition);
        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();

        $this->actingAs($intruder)->getJson('/api/print-ready')->assertOk()->assertExactJson(['editions' => []]);
    }
}
