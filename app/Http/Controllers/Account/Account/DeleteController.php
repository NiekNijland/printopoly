<?php

declare(strict_types=1);

namespace App\Http\Controllers\Account\Account;

use App\Http\Requests\Account\DeleteAccountRequest;
use App\Models\User;
use App\Modules\Accounts\Actions\DeleteAccount;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

/**
 * "Account verwijderen" (B68). The answer says where to go next; the local copy in the
 * browser is the browser's own and stays unless the editor clears it.
 */
final readonly class DeleteController
{
    public function __invoke(#[CurrentUser] User $user, DeleteAccountRequest $request, DeleteAccount $deleteAccount): JsonResponse
    {
        $deleteAccount->handle($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'deleted' => true,
            'redirect' => route('home', ['locale' => app()->getLocale()]),
        ]);
    }
}
