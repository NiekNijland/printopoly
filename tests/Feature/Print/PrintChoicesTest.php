<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\BoardForm;
use App\Enums\PrintPart;
use App\Enums\PrintSet;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

/**
 * The choices of the print page live on the job: skipped parts (bug 6 of test round 3), the amount of play money
 * (B156) and the number of sets. A reload or a visit from Mijn edities shows them again.
 */
final class PrintChoicesTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_the_choices_sent_with_a_run_come_back_on_the_page(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

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

    /**
     * B185: three sets instead of one after the PDFs are made. The order sheet and the instructions in the ZIP say
     * three sets too, without making a PDF again.
     */
    public function test_another_number_of_sets_updates_the_order_sheet_and_the_instructions(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board'])->assertOk();
        $before = PrintScenario::renderer()->calls;

        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'printer', 'copies' => 3])->assertOk();

        $texts = array_slice(PrintScenario::renderer()->htmls, $before);
        self::assertCount(2, $texts, 'the instructions of the board and the order sheet, no PDF of a part');
        self::assertStringContainsString('Je maakt 3 sets', $texts[0] ?? '');
        self::assertStringContainsString('Aantal sets: 3', $texts[1] ?? '');

        // The same number again changes nothing.
        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'printer', 'copies' => 3])->assertOk();
        self::assertSame($before + 2, PrintScenario::renderer()->calls);
    }

    public function test_a_choice_can_be_kept_without_a_run_and_only_the_sent_fields_change(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
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

    public function test_another_amount_of_money_outdates_the_money_but_nothing_else(): void
    {
        $job = PrintScenario::createAnonymousJob($this);

        PrintScenario::generate($this, $job, 'home', ['money', 'cards'])->assertOk();
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Home, PrintPart::Money));

        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'home', 'moneyAmount' => 'full'])->assertOk();

        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::Home, PrintPart::Money));
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Home, PrintPart::Cards));

        // Back to the amount it was made with: current again, nothing to make.
        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'home', 'moneyAmount' => 'four'])->assertOk();
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Home, PrintPart::Money));
    }

    /**
     * B242: more sets put every set in the cards and the money PDF, each with its set mark, so those two are outdated.
     * The board stays one set and stays current.
     */
    public function test_more_sets_outdate_the_cards_and_the_money_but_not_the_board(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'home', ['board', 'cards', 'money'])->assertOk();

        $this->postJson('/api/print/' . $job->token . '/choices', ['set' => 'home', 'copies' => 3])->assertOk();

        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::Home, PrintPart::Cards));
        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::Home, PrintPart::Money));
        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Home, PrintPart::Board));
    }

    /**
     * B243 and B244: the whole board is another PDF of the board in the print-shop set; the number of invitations
     * only changes the texts. Both are kept on the job.
     */
    public function test_the_board_form_and_the_number_of_invitations_are_kept_per_set(): void
    {
        $job = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $job, 'printer', ['board', 'invitation'])->assertOk();
        $before = PrintScenario::renderer()->calls;
        $url = '/api/print/' . $job->token . '/choices';

        $this->postJson($url, ['set' => 'printer', 'invitations' => 80])->assertOk();

        self::assertSame('done', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Invitation));
        $texts = array_slice(PrintScenario::renderer()->htmls, $before);
        self::assertTrue(array_any($texts, static fn (string $html): bool => str_contains($html, 'Aantal: 80 stuks')), 'the instruction counts 80 invitations');

        $this->postJson($url, ['set' => 'printer', 'boardForm' => 'whole'])->assertOk();
        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Board));

        $choice = ($job->fresh() ?? $job)->choiceFor(PrintSet::Printer);
        self::assertSame(BoardForm::Whole, $choice->boardForm);
        self::assertSame(80, $choice->invitations);
        // The home set keeps its own choices.
        self::assertSame(BoardForm::Panels, ($job->fresh() ?? $job)->choiceFor(PrintSet::Home)->boardForm);

        $this->postJson($url, ['set' => 'printer', 'invitations' => 501])->assertUnprocessable();
        $this->postJson($url, ['set' => 'printer', 'boardForm' => 'round'])->assertUnprocessable();
    }

    public function test_uploading_editions_is_limited_per_address_with_room_for_a_class(): void
    {
        // §2.1 of test round 3: 6 a minute was too few for a class on one wifi.
        config(['printopoly.limits.anonymous_jobs_per_ip' => 100]);

        for ($i = 0; $i < 20; $i++) {
            PrintScenario::postAnonymousJob($this)->assertCreated();
        }

        PrintScenario::postAnonymousJob($this)->assertTooManyRequests()->assertHeader('Retry-After');
    }
}
