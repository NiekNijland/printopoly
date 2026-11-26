<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Box;

use App\Http\Controllers\Controller;
use App\Models\CollectionBox;
use App\Modules\Boxes\Support\BoxPresenter;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The page friends open from the link (B128). No account is needed: the secret token in the link is the key,
 * and all it lets them do is add. A link that "Nieuwe link" replaced shows a page that says so, with the name of the
 * edition and nothing else (B175). An unknown or expired link is a 404, like any page that is not there.
 */
final class ShowController extends Controller
{
    public function __invoke(string $locale, string $token, BoxPresenter $presenter): Response
    {
        // The {locale} segment is positional; SetLocale has already applied it.
        unset($locale);

        $box = CollectionBox::query()->where('token', $token)->first();

        if (! $box instanceof CollectionBox) {
            $replaced = CollectionBox::query()->where('replaced_tokens', CollectionBox::tokenHash($token))->first();

            abort_unless($replaced instanceof CollectionBox && $replaced->expires_at->isFuture(), 404);

            return Inertia::render('boxes/show', ['box' => $presenter->replaced($replaced)]);
        }

        abort_unless($box->expires_at->isFuture(), 404);

        return Inertia::render('boxes/show', ['box' => $presenter->friend($box)]);
    }
}
