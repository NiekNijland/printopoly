<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Commands;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Commands\CleanupBoxesCommand;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Console\Output\BufferedOutput;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class CleanupBoxesCommandTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_it_removes_expired_boxes_and_says_how_many(): void
    {
        $expired = CollectionBox::factory()->createOne(['expires_at' => now()->subDay()->toImmutable()]);
        $live = CollectionBox::factory()->createOne();
        BoxContribution::factory()->count(2)->create(['box_id' => $expired->publicId()]);

        $output = new BufferedOutput();

        $status = Artisan::call(CleanupBoxesCommand::class, [], $output);

        self::assertSame(0, $status);
        self::assertSame('Removed 1 boxes and 2 contributions.', trim($output->fetch()));

        self::assertSame([$live->publicId()], CollectionBox::query()->pluck('id')->all());
        self::assertSame(0, BoxContribution::query()->count());
    }

    public function test_with_nothing_to_remove_it_still_succeeds(): void
    {
        $output = new BufferedOutput();

        self::assertSame(0, Artisan::call('printopoly:cleanup-boxes', [], $output));
        self::assertSame('Removed 0 boxes and 0 contributions.', trim($output->fetch()));
    }
}
