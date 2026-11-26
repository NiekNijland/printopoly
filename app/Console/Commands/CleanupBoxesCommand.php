<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Boxes\BoxCleanup;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Description('Delete collection boxes that had no activity for the retention period, with their contributions and photos')]
#[Signature('printopoly:cleanup-boxes')]
final class CleanupBoxesCommand extends Command
{
    public function handle(BoxCleanup $cleanup): int
    {
        $counts = $cleanup->run();

        $this->info(sprintf('Removed %d boxes and %d contributions.', $counts['boxes'], $counts['contributions']));

        return self::SUCCESS;
    }
}
