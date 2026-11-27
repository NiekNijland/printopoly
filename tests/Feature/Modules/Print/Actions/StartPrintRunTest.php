<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Actions;

use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Actions\StartPrintRun;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Jobs\GeneratePrintJob;
use Illuminate\Support\Facades\Queue;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class StartPrintRunTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_language_of_the_site_and_the_choices_travel_with_the_run(): void
    {
        Queue::fake([GeneratePrintJob::class]);
        $job = PrintScenario::createAnonymousJob($this);

        resolve(StartPrintRun::class)->handle($job, PrintSet::Home, [PrintPart::Cards], Locale::English, ['skipped' => ['money']], null);

        $stored = $job->refresh();
        self::assertSame('en', $stored->locale);
        self::assertSame([PrintPart::Money], $stored->choiceFor(PrintSet::Home)->skipped);
        Queue::assertPushed(GeneratePrintJob::class);
    }

    public function test_a_busy_job_keeps_its_language_and_starts_nothing(): void
    {
        Queue::fake([GeneratePrintJob::class]);
        $job = PrintJob::factory()->createOne(['locale' => 'nl', 'active_at' => now()]);

        try {
            resolve(StartPrintRun::class)->handle($job, PrintSet::Home, [PrintPart::Cards], Locale::English, null, null);
            self::fail('A busy job started a second run.');
        } catch (HttpException $httpException) {
            self::assertSame(409, $httpException->getStatusCode());
        }

        self::assertSame('nl', $job->refresh()->locale);
        Queue::assertNotPushed(GeneratePrintJob::class);
    }
}
