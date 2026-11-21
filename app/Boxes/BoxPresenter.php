<?php

declare(strict_types=1);

namespace App\Boxes;

use App\Models\BoxContribution;
use App\Models\CollectionBox;

/**
 * The JSON a box shows to the people who may see it (B128). Friends get the snapshot and the state of the box and
 * nothing of what others sent; the owner gets the list of contributions to decide on.
 */
final readonly class BoxPresenter
{
    public function __construct(private BoxTargets $targets)
    {
    }

    public function friendUrl(CollectionBox $box): string
    {
        return route('boxes.show', ['locale' => $box->language, 'token' => $box->token]);
    }

    /**
     * What the friends' page needs.
     *
     * @return array{token: string, editionName: string, language: string, status: string, snapshot: array<string, mixed>, limits: array{name: int, text: int, firstName: int, photoMegabytes: int}}
     */
    public function friend(CollectionBox $box): array
    {
        return [
            'token' => $box->token,
            'editionName' => $box->edition_name,
            'language' => $box->language,
            'status' => $box->isOpen() ? CollectionBox::OPEN : CollectionBox::CLOSED,
            'snapshot' => $this->friendSnapshot($box),
            'limits' => [
                'name' => BoxTargets::MAX_NAME,
                'text' => BoxTargets::MAX_TEXT,
                'firstName' => BoxTargets::MAX_FIRST_NAME,
                'photoMegabytes' => config()->integer('printopoly.boxes.photo_max_megabytes'),
            ],
        ];
    }

    /**
     * The snapshot as friends may see it: without the card texts when the owner keeps them to themselves (B176).
     * The extra cards stay, without their text, so friends can still add to them.
     *
     * @return array<string, mixed>
     */
    private function friendSnapshot(CollectionBox $box): array
    {
        $snapshot = $box->snapshot;

        if ($box->cards_hidden !== true) {
            return $snapshot;
        }

        $elements = [];

        foreach ($snapshot['elements'] as $key => $element) {
            if (str_starts_with($key, 'card.')) {
                unset($element['text']);

                if ($element === []) {
                    continue;
                }
            }

            $elements[$key] = $element;
        }

        return [...$snapshot, 'elements' => (object) $elements, 'cardsHidden' => true];
    }

    /**
     * What the page of a link that "Nieuwe link" replaced shows (B175): the name of the edition, so the friend knows
     * whom to ask, and nothing of its contents.
     *
     * @return array<string, mixed>
     */
    public function replaced(CollectionBox $box): array
    {
        return [
            ...$this->friend($box),
            'token' => '',
            'status' => CollectionBox::REPLACED,
            'snapshot' => ['theme' => $box->snapshot['theme'], 'currency' => null, 'parts' => ['cards' => false, 'pawns' => false], 'elements' => (object) []],
        ];
    }

    /**
     * What the owner's editor needs: the link, the state and the contributions waiting.
     *
     * @return array<string, mixed>
     */
    public function owner(CollectionBox $box): array
    {
        $contributions = BoxContribution::query()->where('box_id', $box->publicId())->orderBy('created_at')->get();

        return [
            'id' => $box->publicId(),
            'editionId' => $box->edition_id,
            'url' => $this->friendUrl($box),
            'status' => $box->isOpen() ? CollectionBox::OPEN : CollectionBox::CLOSED,
            'expiresAt' => $box->expires_at->getTimestampMs(),
            'accepted' => $box->accepted_count,
            'rejected' => $box->rejected_count,
            'cardsHidden' => $box->cards_hidden === true,
            'channel' => 'box-owner.' . $box->channel,
            'contributions' => $contributions->map(fn (BoxContribution $contribution): array => $this->contribution($box, $contribution))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function contribution(CollectionBox $box, BoxContribution $contribution): array
    {
        $key = $contribution->element_key;
        $field = $this->targets->field($key);

        return [
            'id' => $contribution->publicId(),
            'elementKey' => $key,
            'firstName' => $contribution->first_name,
            'field' => $field,
            'value' => $contribution->value,
            'amount' => $contribution->amount,
            // What the owner has not applied or passed over yet (B175).
            'open' => $contribution->openParts($field),
            'hasPhoto' => $contribution->hasPhoto(),
            'width' => $contribution->width,
            'height' => $contribution->height,
            'photoUrl' => $contribution->hasPhoto()
                ? route('api.boxes.photo', ['boxId' => $box->publicId(), 'contributionId' => $contribution->publicId()], false)
                : null,
            'createdAt' => $contribution->created_at?->getTimestampMs(),
        ];
    }
}
