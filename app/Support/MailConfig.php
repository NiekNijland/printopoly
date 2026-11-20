<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Whether outgoing mail can really reach people. The `log` and `array`
 * mailers only write or collect mails, and SMTP needs a host and a login.
 * The deletion of unused accounts depends on this (B120).
 */
final class MailConfig
{
    public static function isConfigured(): bool
    {
        $mailer = config('mail.default');

        if (! is_string($mailer) || in_array($mailer, ['', 'log', 'array'], true)) {
            return false;
        }

        if ($mailer !== 'smtp') {
            return true;
        }

        return self::filled(config('mail.mailers.smtp.host'))
            && self::filled(config('mail.mailers.smtp.username'))
            && self::filled(config('mail.mailers.smtp.password'));
    }

    private static function filled(mixed $value): bool
    {
        return is_string($value) && $value !== '';
    }
}
