<?php

declare(strict_types=1);

namespace Tests\Feature\Support;

use App\Support\MailConfig;
use Tests\TestCase;

final class MailConfigTest extends TestCase
{
    public function test_a_mailer_that_only_writes_or_collects_mail_is_not_configured(): void
    {
        foreach (['log', 'array', '', null] as $mailer) {
            config(['mail.default' => $mailer]);

            self::assertFalse(MailConfig::isConfigured());
        }
    }

    public function test_another_mailer_than_smtp_is_configured_by_itself(): void
    {
        config(['mail.default' => 'postmark']);

        self::assertTrue(MailConfig::isConfigured());
    }

    public function test_smtp_needs_a_host_a_username_and_a_password(): void
    {
        $complete = ['host' => 'smtp.printopoly.test', 'username' => 'post', 'password' => 'wachtwoord'];
        config(['mail.default' => 'smtp', 'mail.mailers.smtp' => $complete]);
        self::assertTrue(MailConfig::isConfigured());

        foreach (array_keys($complete) as $missing) {
            config(['mail.mailers.smtp' => [...$complete, $missing => '']]);
            self::assertFalse(MailConfig::isConfigured(), 'smtp without ' . $missing);
        }

        config(['mail.mailers.smtp' => ['host' => 'smtp.printopoly.test']]);
        self::assertFalse(MailConfig::isConfigured());
    }
}
