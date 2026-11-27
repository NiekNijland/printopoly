<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Services;

use App\Models\PrintFile;
use App\Models\PrintJob;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Services\PrintDownloadService;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class PrintDownloadServiceTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_part_of_the_job_is_found_in_its_set(): void
    {
        $job = PrintJob::factory()->createOne();
        $file = PrintFile::factory()->createOne(['print_job_id' => $job->publicId(), 'part' => 'cards', 'set' => 'home']);

        self::assertTrue($file->is(resolve(PrintDownloadService::class)->part($job, PrintSet::HOME, PrintPart::CARDS)));
    }

    public function test_an_expired_part_is_not_found(): void
    {
        $job = PrintJob::factory()->createOne();
        PrintFile::factory()->createOne(['print_job_id' => $job->publicId(), 'part' => 'cards', 'set' => 'home', 'expires_at' => now()->subMinute()]);

        $this->expectException(NotFoundHttpException::class);

        resolve(PrintDownloadService::class)->part($job, PrintSet::HOME, PrintPart::CARDS);
    }

    public function test_a_part_of_another_job_is_not_found(): void
    {
        $job = PrintJob::factory()->createOne();
        PrintFile::factory()->createOne(['part' => 'cards', 'set' => 'home']);

        $this->expectException(NotFoundHttpException::class);

        resolve(PrintDownloadService::class)->part($job, PrintSet::HOME, PrintPart::CARDS);
    }

    public function test_instructions_without_a_set_are_found_for_any_set(): void
    {
        $job = PrintJob::factory()->createOne();
        $file = PrintFile::factory()->createOne(['print_job_id' => $job->publicId(), 'kind' => PrintFile::KIND_INSTRUCTIONS, 'part' => 'cards', 'set' => 'printer']);

        self::assertTrue($file->is(resolve(PrintDownloadService::class)->instructions($job, PrintPart::CARDS, null)));
    }
}
