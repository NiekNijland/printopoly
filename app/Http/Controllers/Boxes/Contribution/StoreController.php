<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes\Contribution;

use App\Http\Controllers\Controller;
use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Events\BoxActivityEvent;
use App\Modules\Boxes\Support\BoxCleanup;
use App\Modules\Boxes\Support\BoxPhotos;
use App\Modules\Boxes\Support\BoxTargets;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * A friend adds something to a box (B128): for one space, card (an extra one too, B135) or pawn a photo and/or a suggested name or text,
 * with their first name. For a card also an amount, and for a deck with room a new card (B175). Nothing here reads
 * anything: the answer holds only the friend's own receipt.
 *
 * Abuse: the route is throttled per link and address, the honeypot field `website` is for bots (a filled one gets
 * a success answer and nothing is stored), sizes and counts are capped, links in texts are refused, and the photo
 * goes through the same checks as every upload (B69).
 */
final class StoreController extends Controller
{
    public function __invoke(Request $request, string $token, BoxTargets $targets, BoxPhotos $photos, BoxCleanup $cleanup): JsonResponse
    {
        $request->validate([
            'elementKey' => ['required', 'string', 'max:40'],
            'firstName' => ['required', 'string', 'max:80'],
            'value' => ['nullable', 'string', 'max:1000'],
            'amount' => ['nullable', 'integer', 'between:-100000,100000'],
            'photo' => ['nullable', 'file'],
            'website' => ['nullable', 'string', 'max:200'],
        ]);

        if ($request->filled('website')) {
            return response()->json(['id' => (string) Str::ulid(), 'receipt' => Str::random(32)], 201);
        }

        $box = CollectionBox::query()->where('token', $token)->first();

        if (! $box instanceof CollectionBox && CollectionBox::query()->where('replaced_tokens', CollectionBox::tokenHash($token))->exists()) {
            throw ValidationException::withMessages(['box' => __('boxes.replaced')])->status(410);
        }

        abort_unless($box instanceof CollectionBox && $box->expires_at->isFuture(), 404);

        if (! $box->isOpen()) {
            throw ValidationException::withMessages(['box' => __('boxes.closed')])->status(409);
        }

        $key = $request->string('elementKey')->toString();

        if (! $targets->allowsIn($key, $box->snapshot)) {
            throw ValidationException::withMessages(['elementKey' => __('boxes.cannot_add_here')]);
        }

        $firstName = mb_substr(BoxTargets::tidy($request->string('firstName')->toString()), 0, BoxTargets::MAX_FIRST_NAME);
        $value = BoxTargets::tidy($request->string('value')->toString());
        $file = $request->file('photo');
        $amount = $request->filled('amount') ? $request->integer('amount') : null;

        if ($amount !== null && ! $targets->amountAllowed($key, $amount)) {
            throw ValidationException::withMessages(['amount' => __('boxes.amount_not_allowed')]);
        }

        if ($file instanceof UploadedFile && ! $targets->takesPhoto($key)) {
            throw ValidationException::withMessages(['photo' => __('boxes.cannot_add_here')]);
        }

        if ($firstName === '') {
            throw ValidationException::withMessages(['firstName' => __('boxes.first_name_required')]);
        }

        if ($value === '' && ! $file instanceof UploadedFile && $amount === null) {
            throw ValidationException::withMessages(['value' => __('boxes.nothing_to_add')]);
        }

        if (mb_strlen($value) > $targets->maxLength($key)) {
            throw ValidationException::withMessages(['value' => __('boxes.too_long', ['max' => $targets->maxLength($key)])]);
        }

        if (BoxTargets::looksLikeLink($value) || BoxTargets::looksLikeLink($firstName)) {
            throw ValidationException::withMessages(['value' => __('boxes.no_links')]);
        }

        $this->assertRoom($box, $file instanceof UploadedFile);

        $photo = [];

        if ($file instanceof UploadedFile) {
            try {
                $photo = $photos->store($file, $box);
            } catch (PhotoRejectedException $rejected) {
                throw ValidationException::withMessages(['photo' => $rejected->translated()]);
            }
        }

        $contribution = new BoxContribution([
            'box_id' => $box->publicId(),
            'element_key' => $key,
            'first_name' => $firstName,
            'value' => $value === '' ? null : $value,
            'amount' => $amount,
            'receipt' => Str::random(32),
            'ip_hash' => hash_hmac('sha256', (string) $request->ip(), config()->string('app.key')),
            ...$photo,
        ]);

        try {
            $contribution->save();
        } catch (Throwable $throwable) {
            if ($photo !== []) {
                $cleanup->deleteContribution($contribution);
            }

            throw $throwable;
        }

        $box->last_activity_at = CarbonImmutable::now();
        $box->expires_at = CarbonImmutable::now()->addDays(config()->integer('printopoly.boxes.retention_days'));
        $box->save();

        $this->announce($box);

        return response()->json(['id' => $contribution->publicId(), 'receipt' => $contribution->receipt], 201);
    }

    private function assertRoom(CollectionBox $box, bool $withPhoto): void
    {
        $query = BoxContribution::query()->where('box_id', $box->publicId());

        if ($query->count() >= config()->integer('printopoly.boxes.max_contributions')) {
            throw ValidationException::withMessages(['box' => __('boxes.full')])->status(409);
        }

        if ($withPhoto && (clone $query)->whereNotNull('print_path')->count() >= config()->integer('printopoly.boxes.max_photos')) {
            throw ValidationException::withMessages(['photo' => __('boxes.full_photos')])->status(409);
        }
    }

    /**
     * Live news for the owner. A Reverb that is down must never fail the friend's upload.
     */
    private function announce(CollectionBox $box): void
    {
        try {
            event(new BoxActivityEvent($box, BoxContribution::query()->where('box_id', $box->publicId())->count()));
        } catch (Throwable $throwable) {
            report($throwable);
        }
    }
}
