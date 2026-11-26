<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Print\PrintCleanup;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Description('Delete print files and anonymous print jobs (with their photos) older than the retention period')]
#[Signature('printopoly:cleanup')]
final class CleanupPrintFilesCommand extends Command
{
    public function handle(PrintCleanup $cleanup): int
    {
        $counts = $cleanup->run();

        $this->info(sprintf('Removed %d jobs, %d files and %d photos.', $counts['jobs'], $counts['files'], $counts['assets']));

        return self::SUCCESS;
    }
}
