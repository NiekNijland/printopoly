<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\Test;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

/**
 * The choices of the print page live on the job: skipped parts (bug 6 of test round 3), the amount of play money
 * (B156) and the number of sets. A reload or a visit from Mijn edities shows them again.
 */
final class PrintChoicesTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    #[Test]
    public function the_choices_sent_with_a_run_come_back_on_the_page(): void
    {
        $job = $this->createAnonymousJob();

        $this->postJson('/api/print/' . $job->token . '/generate', [
            'set' => 'home',
            'parts' => ['board'],
            'choices' => ['skipped' => ['money', 'tokens'], 'moneyAmount' => 'eight', 'copies' => 3],
        ])->assertOk();

        $this->get('/nl/print/' . $job->token)->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
            ->component('print/show')
            ->where('job.choices.home.skipped', ['money', 'tokens'])
            ->where('job.choices.home.moneyAmount', 'eight')
            ->where('job.choices.home.copies', 3)
            ->where('job.choices.printer.skipped', [])
            ->where('job.choices.printer.moneyAmount', null)
            ->where('job.choices.printer.copies', 1));
    }

    #[Test]
    public function a_choice_can_be_kept_without_a_run_and_only_the_sent_fields_change(): void
    {
        $job = $this->createAnonymousJob();
        $url = '/api/print/' . $job->token . '/choices';

        $this->postJson($url, ['set' => 'printer', 'skipped' => ['box_lid', 'board']])->assertOk();
        $this->postJson($url, ['set' => 'printer', 'copies' => 2])->assertOk();

        $choice = ($job->fresh() ?? $job)->choiceFor(PrintSet::Printer);
        // The board can never be skipped.
        self::assertSame([PrintPart::BoxLid], $choice->skipped);
        self::assertSame(2, $choice->copies);

        $this->postJson($url, ['set' => 'printer', 'copies' => 41])->assertUnprocessable();
        $this->postJson($url, ['set' => 'printer', 'moneyAmount' => 'lots'])->assertUnprocessable();
        $this->postJson('/api/print/' . str_repeat('x', 40) . '/choices', ['set' => 'printer'])->assertNotFound();
    }

    #[Test]
    public function another_amount_of_money_outdates_the_money_but_nothing_else(): void
    {
        $job = $this->createAnonymousJob();

        $this->generate($job, 'home', ['money', 'cards'])->assertOk();
        self::assertSame('done', $this->partStatus($job, PrintSet::Home, PrintPart::Money));

        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'home', 'moneyAmount' => 'full'])->assertOk();

        self::assertSame('outdated', $this->partStatus($job, PrintSet::Home, PrintPart::Money));
        self::assertSame('done', $this->partStatus($job, PrintSet::Home, PrintPart::Cards));

        // Back to the amount it was made with: current again, nothing to make.
        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'home', 'moneyAmount' => 'four'])->assertOk();
        self::assertSame('done', $this->partStatus($job, PrintSet::Home, PrintPart::Money));
    }

    #[Test]
    public function uploading_editions_is_limited_per_address_with_room_for_a_class(): void
    {
        // §2.1 of test round 3: 6 a minute was too few for a class on one wifi.
        config(['printopoly.limits.anonymous_jobs_per_ip' => 100]);

        for ($i = 0; $i < 20; $i++) {
            $this->postAnonymousJob()->assertCreated();
        }

        $this->postAnonymousJob()->assertTooManyRequests()->assertHeader('Retry-After');
    }
}
