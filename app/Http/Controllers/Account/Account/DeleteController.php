<?php

declare(strict_types=1);

namespace App\Http\Controllers\Account\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\DeleteAccountRequest;
use App\Models\User;
use App\Modules\Accounts\Actions\DeleteAccount;
use Illuminate\Http\JsonResponse;

/**
 * "Account verwijderen" (B68). The answer says where to go next; the local copy in the
 * browser is the browser's own and stays unless the editor clears it.
 */
final class DeleteController extends Controller
{
    public function __invoke(DeleteAccountRequest $request, DeleteAccount $deleteAccount): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $deleteAccount->handle($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'deleted' => true,
            'redirect' => route('home', ['locale' => app()->getLocale()]),
        ]);
    }
}
