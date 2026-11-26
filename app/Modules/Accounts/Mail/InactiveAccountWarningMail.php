<?php

declare(strict_types=1);

namespace App\Modules\Accounts\Mail;

use App\Models\User;
use App\Modules\Content\Enums\Locale;
use Carbon\CarbonImmutable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * The warning that an unused account goes away (B120). It is sent in the
 * language the person used and names the date of the deletion.
 */
final class InactiveAccountWarningMail extends Mailable
{
    public function __construct(
        public readonly User $user,
        public readonly CarbonImmutable $deletionDate,
        public readonly Locale $mailLocale,
    ) {
        $this->locale($mailLocale->value);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->mailLocale === Locale::English
                ? 'Your Printopoly account will be deleted'
                : 'Je Printopoly-account wordt verwijderd',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.inactive-account-warning-' . $this->mailLocale->value,
            with: [
                'name' => $this->user->name,
                'date' => $this->formattedDate(),
                'loginUrl' => route('home', ['locale' => $this->mailLocale->value]),
            ],
        );
    }

    private function formattedDate(): string
    {
        $date = $this->deletionDate->locale($this->mailLocale->value);

        return $date instanceof CarbonImmutable ? $date->isoFormat('D MMMM YYYY') : $this->deletionDate->toDateString();
    }
}
