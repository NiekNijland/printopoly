<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Account\ProcessInactiveAccounts;
use Illuminate\Console\Command;
use Override;

final class InactiveAccountsCommand extends Command
{
    #[Override]
    protected $signature = 'printopoly:inactive-accounts';

    #[Override]
    protected $description = 'Warn accounts that were not used for 23 months and delete the ones that were warned 30 days ago and stayed idle';

    public function handle(ProcessInactiveAccounts $process): int
    {
        $counts = $process->handle();

        $this->info(sprintf('Warned %d accounts, deleted %d.', $counts['warned'], $counts['deleted']));

        return self::SUCCESS;
    }
}
