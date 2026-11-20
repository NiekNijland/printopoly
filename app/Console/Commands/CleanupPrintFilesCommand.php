<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Print\PrintCleanup;
use Illuminate\Console\Command;
use Override;

final class CleanupPrintFilesCommand extends Command
{
    #[Override]
    protected $signature = 'printopoly:cleanup';

    #[Override]
    protected $description = 'Delete print files and anonymous print jobs (with their photos) older than the retention period';

    public function handle(PrintCleanup $cleanup): int
    {
        $counts = $cleanup->run();

        $this->info(sprintf('Removed %d jobs, %d files and %d photos.', $counts['jobs'], $counts['files'], $counts['assets']));

        return self::SUCCESS;
    }
}
