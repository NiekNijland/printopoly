<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\Asset;
use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintCleanup;
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

        self::assertSame('outdated', PrintScenario::partStatus($this, $job, PrintSet::PRINTER, PrintPart::CARDS));

        PrintScenario::generate($this, $job, 'printer', ['cards'])->assertOk();
        self::assertGreaterThan($callsBefore, PrintScenario::renderer()->calls);
    }

    public function test_the_cleanup_is_scheduled_daily(): void
    {
        $events = collect(resolve(Schedule::class)->events())->filter(fn (Event $event): bool => preg_match('/printopoly:cleanup$/', (string) $event->command) === 1);

        self::assertCount(1, $events);
        self::assertSame('30 3 * * *', $events->first()?->expression);
    }

    public function test_deleting_an_edition_or_a_user_takes_only_their_jobs_files_and_photos(): void
    {
        Storage::disk('local')->put('assets/sanne/print.jpg', 'foto');
        $sanneJob = PrintJob::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'zaterdagclub']);
        $sanneOther = PrintJob::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'zondagclub']);
        $bramJob = PrintJob::factory()->createOne(['user_id' => 'bram', 'edition_id' => 'zaterdagclub']);
        PrintFile::factory()->createOne(['print_job_id' => $sanneJob->publicId()]);
        PrintFile::factory()->createOne(['print_job_id' => $bramJob->publicId()]);
        Asset::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'zaterdagclub', 'print_path' => 'assets/sanne/print.jpg']);
        Asset::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'zondagclub']);
        Asset::factory()->createOne(['user_id' => 'bram', 'edition_id' => 'zaterdagclub']);
        $cleanup = resolve(PrintCleanup::class);

        $cleanup->deleteEdition('sanne', 'zaterdagclub');

        self::assertNull(PrintJob::query()->find($sanneJob->getKey()));
        self::assertNotNull(PrintJob::query()->find($sanneOther->getKey()));
        self::assertSame(0, PrintFile::query()->where('print_job_id', $sanneJob->publicId())->count());
        self::assertSame(0, Asset::query()->where('user_id', 'sanne')->where('edition_id', 'zaterdagclub')->count());
        self::assertFalse(Storage::disk('local')->exists('assets/sanne/print.jpg'));
        self::assertSame(1, Asset::query()->where('user_id', 'sanne')->count());

        $cleanup->deleteUser('sanne');

        self::assertSame(0, PrintJob::query()->where('user_id', 'sanne')->count());
        self::assertSame(0, Asset::query()->where('user_id', 'sanne')->count());
        self::assertNotNull(PrintJob::query()->find($bramJob->getKey()));
        self::assertSame(1, PrintFile::query()->count());
        self::assertSame(1, Asset::query()->count());
    }

    public function test_a_run_counts_what_it_removed_and_leaves_what_has_not_expired(): void
    {
        PrintJob::factory()->createOne(['expires_at' => now()->subMinute()->toImmutable()]);
        PrintJob::factory()->createOne(['expires_at' => now()->addDay()->toImmutable()]);
        PrintFile::factory()->createOne(['expires_at' => now()->subMinute()->toImmutable()]);
        PrintFile::factory()->createOne(['expires_at' => now()->addDay()->toImmutable()]);
        Asset::factory()->createOne(['expires_at' => now()->subMinute()->toImmutable()]);
        Asset::factory()->createOne(['user_id' => 'sanne', 'expires_at' => null]);

        self::assertSame(['jobs' => 1, 'files' => 1, 'assets' => 1], resolve(PrintCleanup::class)->run());
        self::assertSame(['jobs' => 0, 'files' => 0, 'assets' => 0], resolve(PrintCleanup::class)->run());
        self::assertSame(1, PrintJob::query()->count());
        self::assertSame(1, PrintFile::query()->count());
        self::assertSame(1, Asset::query()->count());
    }

    public function test_a_run_removes_every_expired_job_file_and_photo_past_one_page(): void
    {
        foreach (range(1, 110) as $index) {
            $job = PrintJob::factory()->createOne(['expires_at' => now()->subMinutes($index)->toImmutable()]);
            PrintFile::factory()->createOne(['print_job_id' => $job->publicId(), 'expires_at' => now()->addDay()->toImmutable()]);
            Asset::factory()->createOne(['print_job_id' => $job->publicId(), 'expires_at' => now()->addDay()->toImmutable()]);
            PrintFile::factory()->createOne(['expires_at' => now()->subMinutes($index)->toImmutable()]);
            Asset::factory()->createOne(['expires_at' => now()->subMinutes($index)->toImmutable()]);
        }

        $kept = PrintJob::factory()->createOne(['expires_at' => now()->addDay()->toImmutable()]);

        self::assertSame(['jobs' => 110, 'files' => 220, 'assets' => 220], resolve(PrintCleanup::class)->run());
        self::assertSame([$kept->publicId()], PrintJob::query()->pluck('id')->all());
        self::assertSame(0, PrintFile::query()->count());
        self::assertSame(0, Asset::query()->count());
    }

    public function test_deleting_a_user_takes_the_files_of_every_job_of_the_user(): void
    {
        $jobs = [
            PrintJob::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'zaterdagclub']),
            PrintJob::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'zondagclub']),
        ];

        foreach ($jobs as $job) {
            PrintFile::factory()->createOne(['print_job_id' => $job->publicId()]);
            Asset::factory()->createOne(['print_job_id' => $job->publicId(), 'user_id' => null, 'edition_id' => null]);
        }

        $kept = PrintFile::factory()->createOne();

        resolve(PrintCleanup::class)->deleteUser('sanne');

        self::assertSame(0, PrintJob::query()->count());
        self::assertSame([$kept->getKey()], PrintFile::query()->pluck('id')->all());
        self::assertSame(0, Asset::query()->count());
    }
}
