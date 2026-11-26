<?php

declare(strict_types=1);

namespace App\Modules\Accounts\Commands;

use App\Modules\Accounts\Actions\ProcessInactiveAccounts;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Description('Warn accounts that were not used for 23 months and delete the ones that were warned 30 days ago and stayed idle')]
#[Signature('printopoly:inactive-accounts')]
final class InactiveAccountsCommand extends Command
{
    public function handle(ProcessInactiveAccounts $process): int
    {
        $counts = $process->handle();

        $this->info(sprintf('Warned %d accounts, deleted %d.', $counts['warned'], $counts['deleted']));

        return self::SUCCESS;
    }
}
