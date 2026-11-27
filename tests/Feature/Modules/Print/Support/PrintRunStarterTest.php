<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Print\Enums\PartStatus;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Jobs\GeneratePrintJob;
use App\Modules\Print\Support\PrintRunStarter;
use Illuminate\Support\Facades\Queue;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class PrintRunStarterTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_the_parts_wait_in_the_fixed_order_and_one_run_is_queued(): void
    {
        Queue::fake([GeneratePrintJob::class]);
        $job = PrintScenario::createAnonymousJob($this);

        resolve(PrintRunStarter::class)->start($job, PrintSet::Printer, [PrintPart::Money, PrintPart::Calibration, PrintPart::Board]);

        $stored = $job->refresh();
        self::assertSame(now()->toDateTimeString(), $stored->active_at?->toDateTimeString());
        self::assertSame(['status' => 'waiting', 'cache_key' => null, 'error' => null, 'after' => null], $stored->states['printer_board']);
        self::assertSame(['status' => 'waiting', 'cache_key' => null, 'error' => null, 'after' => 'board'], $stored->states['printer_money']);
        self::assertSame(['status' => 'waiting', 'cache_key' => null, 'error' => null, 'after' => 'money'], $stored->states['home_calibration']);
        self::assertArrayNotHasKey('printer_calibration', $stored->states);
        Queue::assertPushed(GeneratePrintJob::class, 1);
        Queue::assertPushed(GeneratePrintJob::class, static fn (GeneratePrintJob $queued): bool => $queued->printJobId === $job->publicId()
            && $queued->targets === [['printer', 'board'], ['printer', 'money'], ['home', 'calibration']]
            && $queued->queue === 'pdf');
    }

    public function test_the_measured_photo_frames_are_kept_with_the_job(): void
    {
        Queue::fake([GeneratePrintJob::class]);
        $job = PrintScenario::createAnonymousJob($this);
        $targets = ['printer' => ['space.01#photo' => ['w' => 46.0, 'h' => 76.0]]];

        resolve(PrintRunStarter::class)->start($job, PrintSet::Printer, [PrintPart::Board], $targets);

        self::assertSame($targets, $job->refresh()->photo_targets);
    }

    public function test_a_run_without_parts_starts_nothing_and_leaves_the_job_idle(): void
    {
        Queue::fake([GeneratePrintJob::class]);
        $job = PrintScenario::createAnonymousJob($this);

        resolve(PrintRunStarter::class)->start($job, PrintSet::Home, []);

        $stored = $job->refresh();
        self::assertNull($stored->active_at);
        self::assertSame(PartStatus::Idle, $stored->recordedState(PrintSet::Home, PrintPart::Cards)['status']);
        Queue::assertNotPushed(GeneratePrintJob::class);
    }

    public function test_a_busy_job_refuses_a_second_run(): void
    {
        Queue::fake([GeneratePrintJob::class]);
        $job = PrintJob::factory()->createOne(['active_at' => now()->subMinutes(2)]);

        try {
            resolve(PrintRunStarter::class)->start($job, PrintSet::Home, [PrintPart::Cards]);
            self::fail('A busy job started a second run.');
        } catch (HttpException $httpException) {
            self::assertSame(409, $httpException->getStatusCode());
        }

        self::assertSame([], $job->refresh()->states);
        Queue::assertNotPushed(GeneratePrintJob::class);
    }

    public function test_a_user_with_a_run_on_another_job_waits_until_it_is_stale(): void
    {
        Queue::fake([GeneratePrintJob::class]);
        config(['printopoly.limits.print_jobs_per_user' => 1]);
        PrintJob::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'e1', 'active_at' => now()->subMinutes(9)]);
        $job = PrintJob::factory()->createOne(['user_id' => 'user-anna', 'edition_id' => 'e2']);
        $starter = resolve(PrintRunStarter::class);

        try {
            $starter->start($job, PrintSet::Home, [PrintPart::Cards]);
            self::fail('A second job of the same user started a run.');
        } catch (HttpException $httpException) {
            self::assertSame(409, $httpException->getStatusCode());
        }

        Queue::assertNotPushed(GeneratePrintJob::class);
    }

    public function test_a_run_of_another_user_or_a_stale_run_does_not_block(): void
    {
        Queue::fake([GeneratePrintJob::class]);
        config(['printopoly.limits.print_jobs_per_user' => 1]);
        $anna = User::factory()->createOne(['name' => 'Anna']);
        $job = PrintScenario::printJobFor($this, $anna, PrintScenario::createEditionFor($this, $anna));
        PrintJob::factory()->createOne(['user_id' => 'user-bob', 'edition_id' => 'e1', 'active_at' => now()]);
        PrintJob::factory()->createOne(['user_id' => $anna->publicId(), 'edition_id' => 'e-oud', 'active_at' => now()->subMinutes(11)]);

        resolve(PrintRunStarter::class)->start($job, PrintSet::Home, [PrintPart::Cards]);

        Queue::assertPushed(GeneratePrintJob::class, 1);
    }
}
