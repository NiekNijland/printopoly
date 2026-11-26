<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Config;

/**
 * Whether outgoing mail can really reach people. The `log` and `array`
 * mailers only write or collect mails, and SMTP needs a host and a login.
 * The deletion of unused accounts depends on this (B120).
 */
final class MailConfig
{
    public static function isConfigured(): bool
    {
        $mailer = Config::array('mail')['default'] ?? null;

        if (! is_string($mailer) || in_array($mailer, ['', 'log', 'array'], true)) {
            return false;
        }

        if ($mailer !== 'smtp') {
            return true;
        }

        $smtp = Config::array('mail.mailers.smtp');

        return self::filled($smtp['host'] ?? null)
            && self::filled($smtp['username'] ?? null)
            && self::filled($smtp['password'] ?? null);
    }

    private static function filled(mixed $value): bool
    {
        return is_string($value) && $value !== '';
    }
}
