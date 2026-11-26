<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Console\Output\BufferedOutput;
use Tests\Concerns\CreatesPrintFixtures;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class PrintCleanupTest extends TestCase
{
    use CreatesPrintFixtures;
    use RefreshesMongoDatabase;

    public function test_an_anonymous_job_goes_away_with_its_photos_and_pdfs_after_seven_days(): void
    {
        $old = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $old, 'printer', ['cards'])->assertOk();
        $fresh = PrintScenario::createAnonymousJob($this);
        PrintScenario::generate($this, $fresh, 'printer', ['cards'])->assertOk();

        self::assertCount(10, Storage::disk('local')->allFiles(), '2 x (preview, print source, PDF, instructions, order sheet)');

        $this->travelTo(CarbonImmutable::now()->addDays(6));
        self::assertSame(0, Artisan::call('printopoly:cleanup'));
        self::assertSame(2, PrintJob::query()->count(), 'still inside the 7 days');

        $old->forceFill(['expires_at' => CarbonImmutable::now()->subMinute()])->save();
        $output = new BufferedOutput();
        self::assertSame(0, Artisan::call('printopoly:cleanup', [], $output));
        self::assertStringContainsString('Removed 1 jobs, 3 files and 1 photos.', $output->fetch());

        self::assertNull(PrintJob::query()->where('token', $old->token)->first());
        self::assertNotNull(PrintJob::query()->where('token', $fresh->token)->first());
        self::assertSame(0, Asset::query()->where('print_job_id', $old->publicId())->count());
        self::assertSame(0, PrintFile::query()->where('print_job_id', $old->publicId())->count());
        self::assertCount(5, Storage::disk('local')->allFiles(), 'only the fresh job is left on disk');

        $this->getJson('/api/print/' . $old->token . '/status')->assertNotFound();
    }

    public function test_a_pdf_of_an_account_goes_after_seven_days_and_the_next_download_makes_it_again(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionFor($this, $user);
        $job = PrintScenario::printJobFor($this, $user, $edition);
        $token = $job->token;

        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        $callsBefore = PrintScenario::renderer()->calls;

        $this->travelTo(CarbonImmutable::now()->addDays(8));
        self::assertSame(0, Artisan::call('printopoly:cleanup'));

        self::assertSame(0, PrintFile::query()->count());
        self::assertNotNull(PrintJob::query()->where('token', $token)->first(), 'the job and the photos of an account stay');
        self::assertSame(1, Asset::query()->where('user_id', $user->publicId())->count());

        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::Printer, PrintPart::Cards));

        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        self::assertGreaterThan($callsBefore, PrintScenario::renderer()->calls);
    }

    public function test_the_cleanup_is_scheduled_daily(): void
    {
        $events = collect(resolve(Schedule::class)->events())->filter(fn (Event $event): bool => preg_match('/printopoly:cleanup$/', (string) $event->command) === 1);

        self::assertCount(1, $events);
        self::assertSame('30 3 * * *', $events->first()?->expression);
    }
}
