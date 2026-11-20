<?php

declare(strict_types=1);

namespace App\Http\Controllers\Account;

use App\Actions\Account\DeleteAccount;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * "Account verwijderen" (B68). The confirmation is checked here, not only in
 * the dialog: the request must carry the e-mail address of the account, typed
 * by the user. The answer says where to go next; the local copy in the
 * browser is the browser's own and stays unless the editor clears it.
 */
final class DeleteAccountController extends Controller
{
    public function __invoke(Request $request, DeleteAccount $deleteAccount): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $request->validate([
            'confirmation' => ['required', 'string'],
        ]);

        if (mb_strtolower($request->string('confirmation')->trim()->toString()) !== mb_strtolower($user->email)) {
            throw ValidationException::withMessages([
                'confirmation' => [__('account.delete_confirmation_mismatch')],
            ]);
        }

        $deleteAccount->handle($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'deleted' => true,
            'redirect' => route('home', ['locale' => app()->getLocale()]),
        ]);
    }
}
