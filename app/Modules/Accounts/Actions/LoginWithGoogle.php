<?php

declare(strict_types=1);

namespace App\Modules\Accounts\Actions;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use UnexpectedValueException;

/**
 * Finds or creates the account for a Google identity and logs it in. We keep
 * only the Google id, the name and the e-mail address (B68).
 */
final readonly class LoginWithGoogle
{
    public function __construct(private RecordActivity $recordActivity)
    {
    }

    public function handle(SocialiteUser $googleUser, string $locale): User
    {
        $googleId = (string) $googleUser->getId();
        $email = $googleUser->getEmail();

        throw_if($googleId === '' || $email === null || $email === '', UnexpectedValueException::class, 'Google did not return an id and e-mail address.');

        $name = $googleUser->getName() ?? $email;

        $user = User::query()->where('google_id', $googleId)->first()
            ?? User::query()->where('email', $email)->first()
            ?? new User(['locale' => $locale]);

        $user->fill([
            'google_id' => $googleId,
            'name' => $name,
            'email' => $email,
        ])->save();

        Auth::login($user, remember: true);

        // Logging in restarts the period of B120 and clears a warning.
        $this->recordActivity->handle($user, force: true);

        return $user;
    }
}
