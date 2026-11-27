<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\BoxContributionFactory;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use LogicException;
use MongoDB\Laravel\Eloquent\Model;
use Override;

/**
 * One thing a friend put in a box (B128): for one element, a first name, a suggested name or card text and/or a
 * photo. It stays here until the owner accepts or rejects it, and then it is deleted together with its photo.
 * `receipt` is the friend's own key to see that they sent it and to see their own photo; it is never shown to
 * anybody else.
 *
 * @property string $id
 * @property string $box_id
 * @property string $element_key
 * @property string $first_name
 * @property string|null $value Suggested name (spaces and pawns) or text (cards).
 * @property int|null $amount Suggested signed amount on a card (minus is paid), B175.
 * @property array<string, string>|null $handled Per part (`name`, `text`, `town`, `photo`, `amount`) what the owner
 *                                               did: `applied` or `passed` (B175). A contribution with nothing open left goes.
 * @property string|null $disk
 * @property string|null $preview_path
 * @property string|null $print_path
 * @property int|null $width
 * @property int|null $height
 * @property int $bytes
 * @property string $receipt
 * @property string|null $ip_hash
 * @property int|null $slot Its place below the limit of the box (QuotaSlots).
 * @property int|null $photo_slot Its place below the photo limit of the box, for a contribution with a photo.
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Connection('mongodb')]
#[Fillable([
    'box_id',
    'element_key',
    'first_name',
    'value',
    'amount',
    'handled',
    'disk',
    'preview_path',
    'print_path',
    'width',
    'height',
    'bytes',
    'receipt',
    'ip_hash',
    'slot',
    'photo_slot',
])]
#[Hidden([
    'receipt',
    'ip_hash',
    'slot',
    'photo_slot',
])]
#[Table(name: 'box_contributions')]
final class BoxContribution extends Model
{
    /** @use HasFactory<BoxContributionFactory> */
    use HasFactory;

    public function publicId(): string
    {
        $key = $this->getKey();

        throw_unless(is_string($key), LogicException::class, 'A contribution only has an id once it is saved.');

        return $key;
    }

    public function hasPhoto(): bool
    {
        return $this->print_path !== null;
    }

    /**
     * What this contribution proposes, by part: the name, text or town (`$field`), the photo and the amount.
     *
     * @return list<string>
     */
    public function parts(string $field): array
    {
        return array_values(array_filter([
            $this->value !== null && $this->value !== '' ? $field : null,
            $this->hasPhoto() ? 'photo' : null,
            $this->amount !== null ? 'amount' : null,
        ], is_string(...)));
    }

    /**
     * The parts the owner has not applied or passed over yet.
     *
     * @return list<string>
     */
    public function openParts(string $field): array
    {
        $handled = $this->handled ?? [];

        return array_values(array_filter($this->parts($field), static fn (string $part): bool => ! isset($handled[$part])));
    }

    /**
     * @return array<string, string>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'bytes' => 'integer',
            'slot' => 'integer',
            'photo_slot' => 'integer',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
