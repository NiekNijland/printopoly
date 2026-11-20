<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Boxes\BoxCleanup;
use Illuminate\Console\Command;
use Override;

final class CleanupBoxesCommand extends Command
{
    #[Override]
    protected $signature = 'printopoly:cleanup-boxes';

    #[Override]
    protected $description = 'Delete collection boxes that had no activity for the retention period, with their contributions and photos';

    public function handle(BoxCleanup $cleanup): int
    {
        $counts = $cleanup->run();

        $this->info(sprintf('Removed %d boxes and %d contributions.', $counts['boxes'], $counts['contributions']));

        return self::SUCCESS;
    }
}
