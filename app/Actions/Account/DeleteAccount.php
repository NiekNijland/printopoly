<?php

declare(strict_types=1);

namespace App\Actions\Account;

use App\Events\AccountDeleting;
use App\Models\Edition;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

/**
 * Deletes an account and everything in it (B68): the editions and, through
 * AccountDeleting, the uploads, derivatives and print files. The user goes
 * last, so a failure half-way leaves an account that can try again.
 */
final readonly class DeleteAccount
{
    public function handle(User $user): void
    {
        $userId = $user->publicId();

        event(new AccountDeleting($userId));

        Edition::query()->where('user_id', $userId)->delete();

        Auth::guard('web')->logout();

        $user->delete();
    }
}
