<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Actions;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Events\BoxActivityEvent;
use App\Modules\Boxes\Support\BoxAccess;
use App\Modules\Boxes\Support\BoxCleanup;
use App\Modules\Boxes\Support\BoxPhotos;
use App\Modules\Boxes\Support\BoxTargets;
use App\Modules\Editions\Support\QuotaSlots;
use App\Modules\Photos\Exceptions\PhotoRejectedException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * A friend adds something to a box (B128): for one space, card (an extra one too, B135) or pawn a photo and/or a suggested name or text,
 * with their first name. For a card also an amount, and for a deck with room a new card (B175).
 *
 * Abuse: sizes and counts are capped, links in texts are refused, and the photo goes through the same checks as every
 * upload (B69).
 */
final readonly class AddContribution
{
    public function __construct(
        private BoxAccess $access,
        private BoxTargets $targets,
        private BoxPhotos $photos,
        private BoxCleanup $cleanup,
        private QuotaSlots $slots,
    ) {
    }

    /**
     * @throws ValidationException
     */
    public function handle(string $token, string $key, string $firstName, string $value, ?int $amount, ?UploadedFile $file, string $ip): BoxContribution
    {
        $box = $this->access->byLink($token);

        if (! $box instanceof CollectionBox) {
            throw ValidationException::withMessages(['box' => __('boxes.replaced')])->status(410);
        }

        $firstName = mb_substr(BoxTargets::tidy($firstName), 0, BoxTargets::MAX_FIRST_NAME);
        $value = BoxTargets::tidy($value);
        $this->check($box, $key, $firstName, $value, $amount, $file);
        $photo = [];

        if ($file instanceof UploadedFile) {
            try {
                $photo = $this->photos->store($file, $box);
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
            'ip_hash' => hash_hmac('sha256', $ip, Config::string('app.key')),
            ...$photo,
        ]);

        try {
            $full = $this->slots->claim($this->quotas($box, $photo !== []), static function (array $slots) use ($contribution): void {
                $contribution->fill($slots)->save();
            });
        } catch (Throwable $throwable) {
            $this->forgetPhoto($contribution, $photo !== []);

            throw $throwable;
        }

        if ($full !== null) {
            $this->forgetPhoto($contribution, $photo !== []);

            throw $this->refusal($full);
        }

        $box->last_activity_at = now();
        $box->expires_at = now()->addDays(Config::integer('printopoly.boxes.retention_days'));
        $box->save();

        $this->announce($box);

        return $contribution;
    }

    /**
     * @throws ValidationException
     */
    private function check(CollectionBox $box, string $key, string $firstName, string $value, ?int $amount, ?UploadedFile $file): void
    {
        if (! $box->isOpen()) {
            throw ValidationException::withMessages(['box' => __('boxes.closed')])->status(409);
        }

        if (! $this->targets->allowsIn($key, $box->snapshot)) {
            throw ValidationException::withMessages(['elementKey' => __('boxes.cannot_add_here')]);
        }

        if ($amount !== null && ! $this->targets->amountAllowed($key, $amount)) {
            throw ValidationException::withMessages(['amount' => __('boxes.amount_not_allowed')]);
        }

        if ($file instanceof UploadedFile && ! $this->targets->takesPhoto($key)) {
            throw ValidationException::withMessages(['photo' => __('boxes.cannot_add_here')]);
        }

        if ($firstName === '') {
            throw ValidationException::withMessages(['firstName' => __('boxes.first_name_required')]);
        }

        if ($value === '' && ! $file instanceof UploadedFile && $amount === null) {
            throw ValidationException::withMessages(['value' => __('boxes.nothing_to_add')]);
        }

        if (mb_strlen($value) > $this->targets->maxLength($key)) {
            throw ValidationException::withMessages(['value' => __('boxes.too_long', ['max' => $this->targets->maxLength($key)])]);
        }

        if (BoxTargets::looksLikeLink($value) || BoxTargets::looksLikeLink($firstName)) {
            throw ValidationException::withMessages(['value' => __('boxes.no_links')]);
        }

        $this->assertRoom($box, $file instanceof UploadedFile);
    }

    private function assertRoom(CollectionBox $box, bool $withPhoto): void
    {
        $full = $this->slots->full($this->quotas($box, $withPhoto));

        if ($full !== null) {
            throw $this->refusal($full);
        }
    }

    /**
     * @return array<string, array{Builder<BoxContribution>, int}>
     */
    private function quotas(CollectionBox $box, bool $withPhoto): array
    {
        $quotas = ['slot' => [BoxContribution::query()->where('box_id', $box->publicId()), Config::integer('printopoly.boxes.max_contributions')]];

        if ($withPhoto) {
            $quotas['photo_slot'] = [BoxContribution::query()->where('box_id', $box->publicId())->whereNotNull('print_path'), Config::integer('printopoly.boxes.max_photos')];
        }

        return $quotas;
    }

    private function forgetPhoto(BoxContribution $contribution, bool $withPhoto): void
    {
        if ($withPhoto) {
            $this->cleanup->deleteContribution($contribution);
        }
    }

    private function refusal(string $full): ValidationException
    {
        return $full === 'photo_slot'
            ? ValidationException::withMessages(['photo' => __('boxes.full_photos')])->status(409)
            : ValidationException::withMessages(['box' => __('boxes.full')])->status(409);
    }

    /**
     * Live news for the owner. A Reverb that is down must never fail the friend's upload.
     */
    private function announce(CollectionBox $box): void
    {
        try {
            $event = new BoxActivityEvent($box, BoxContribution::query()->where('box_id', $box->publicId())->count());
            Event::dispatch($event);
        } catch (Throwable $throwable) {
            report($throwable);
        }
    }
}
