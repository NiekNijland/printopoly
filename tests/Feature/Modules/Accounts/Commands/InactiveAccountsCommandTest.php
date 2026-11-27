<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Accounts\Commands;

use App\Models\User;
use App\Modules\Accounts\Commands\InactiveAccountsCommand;
use App\Modules\Accounts\Mail\InactiveAccountWarningMail;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Console\Output\BufferedOutput;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class InactiveAccountsCommandTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_it_says_how_many_accounts_were_warned_and_deleted(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => 'smtp.example.com',
            'mail.mailers.smtp.username' => 'printopoly',
            'mail.mailers.smtp.password' => 'wachtwoord',
        ]);
        Mail::fake();
        $idle = User::factory()->createOne();
        $idle->forceFill(['last_active_at' => now()->subMonthsNoOverflow(23)->subDay()])->save();
        $warned = User::factory()->createOne(['inactivity_warning_sent_at' => now()->subDays(31)]);
        $warned->forceFill(['last_active_at' => now()->subMonthsNoOverflow(25)])->save();

        $output = new BufferedOutput();
        self::assertSame(0, Artisan::call(InactiveAccountsCommand::class, [], $output));
        self::assertSame("Warned 1 accounts, deleted 1.\n", $output->fetch());

        Mail::assertSent(InactiveAccountWarningMail::class, 1);
        self::assertNull(User::query()->find($warned->getKey()));
    }

    public function test_without_mail_it_reports_nothing_done(): void
    {
        config(['mail.default' => 'log']);

        $output = new BufferedOutput();
        self::assertSame(0, Artisan::call('printopoly:inactive-accounts', [], $output));
        self::assertSame("Warned 0 accounts, deleted 0.\n", $output->fetch());
    }
}
