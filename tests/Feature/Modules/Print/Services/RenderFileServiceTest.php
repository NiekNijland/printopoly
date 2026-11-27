<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Services;

use App\Models\PrintJob;
use App\Modules\Print\Services\RenderFileService;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class RenderFileServiceTest extends TestCase
{
    use RefreshesMongoDatabase;

    /**
     * @return iterable<string, array{string}>
     */
    public static function outsideTheBuild(): iterable
    {
        yield 'a path outside build' => ['index.php'];
        yield 'a step up' => ['build/../index.php'];
        yield 'a file that is not there' => ['build/missing.js'];
    }

    #[DataProvider('outsideTheBuild')]
    public function test_only_a_file_of_the_build_is_served(string $path): void
    {
        $this->expectException(NotFoundHttpException::class);

        resolve(RenderFileService::class)->asset($path);
    }

    public function test_a_crop_is_found_in_the_work_folder_of_its_own_job(): void
    {
        config(['printopoly.storage.disk' => 'local']);
        Storage::fake('local');
        $job = PrintJob::factory()->createOne();
        $name = str_repeat('a', 40) . '.jpg';
        Storage::disk('local')->put('print-work/' . $job->publicId() . '/crops/' . $name, 'x');

        self::assertSame('print-work/' . $job->publicId() . '/crops/' . $name, resolve(RenderFileService::class)->crop($job, 'crops', $name));
    }

    public function test_a_crop_with_another_name_is_not_found(): void
    {
        Storage::fake('local');
        $job = PrintJob::factory()->createOne();

        $this->expectException(NotFoundHttpException::class);

        resolve(RenderFileService::class)->crop($job, 'crops', '../secret.jpg');
    }
}
