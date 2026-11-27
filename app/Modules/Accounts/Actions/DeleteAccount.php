<?php

declare(strict_types=1);

namespace App\Modules\Accounts\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Accounts\Events\AccountDeletingEvent;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;

/**
 * Deletes an account and everything in it (B68): the editions and, through
 * AccountDeletingEvent, the uploads, derivatives and print files. The user goes
 * last, so a failure half-way leaves an account that can try again.
 */
final readonly class DeleteAccount
{
    public function handle(User $user): void
    {
        $userId = $user->publicId();

        Event::dispatch(new AccountDeletingEvent($userId));

        Edition::query()->where('user_id', $userId)->delete();

        Auth::guard('web')->logout();

        $user->delete();
    }
}
