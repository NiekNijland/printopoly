<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Accounts\Mail;

use App\Models\User;
use App\Modules\Accounts\Mail\InactiveAccountWarningMail;
use App\Modules\Content\Enums\Locale;
use Carbon\CarbonImmutable;
use Tests\TestCase;

final class InactiveAccountWarningMailTest extends TestCase
{
    public function test_the_dutch_warning_names_the_person_the_date_and_the_way_in(): void
    {
        $user = User::factory()->makeOne(['name' => 'Anna']);

        $mail = new InactiveAccountWarningMail($user, CarbonImmutable::parse('2027-03-05'), Locale::DUTCH);
        $html = $mail->render();

        self::assertSame('nl', $mail->locale);
        self::assertSame('Je Printopoly-account wordt verwijderd', $mail->envelope()->subject);
        self::assertSame('mail.inactive-account-warning-nl', $mail->content()->markdown);
        self::assertStringContainsString('Hoi Anna', $html);
        self::assertStringContainsString('5 maart 2027', $html);
        self::assertStringContainsString(route('home', ['locale' => 'nl']), $html);
    }

    public function test_the_english_warning_is_in_english(): void
    {
        $user = User::factory()->makeOne(['name' => 'Bob']);

        $mail = new InactiveAccountWarningMail($user, CarbonImmutable::parse('2027-03-05'), Locale::ENGLISH);
        $html = $mail->render();

        self::assertSame('en', $mail->locale);
        self::assertSame('Your Printopoly account will be deleted', $mail->envelope()->subject);
        self::assertSame('mail.inactive-account-warning-en', $mail->content()->markdown);
        self::assertStringContainsString('Hi Bob', $html);
        self::assertStringContainsString('5 March 2027', $html);
        self::assertStringContainsString(route('home', ['locale' => 'en']), $html);
        self::assertStringNotContainsString('maart', $html);
    }
}
