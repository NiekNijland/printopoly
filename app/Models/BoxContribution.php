<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
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
 * @property string|null $disk
 * @property string|null $preview_path
 * @property string|null $print_path
 * @property int|null $width
 * @property int|null $height
 * @property int $bytes
 * @property string $receipt
 * @property string|null $ip_hash
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
class BoxContribution extends Model
{
    #[Override]
    protected $connection = 'mongodb';

    #[Override]
    protected $table = 'box_contributions';

    /** @var list<string> */
    #[Override]
    protected $fillable = [
        'box_id',
        'element_key',
        'first_name',
        'value',
        'disk',
        'preview_path',
        'print_path',
        'width',
        'height',
        'bytes',
        'receipt',
        'ip_hash',
    ];

    /** @var list<string> */
    #[Override]
    protected $hidden = [
        'receipt',
        'ip_hash',
    ];

    public function publicId(): string
    {
        $key = $this->getKey();

        if (! is_string($key)) {
            throw new LogicException('A contribution only has an id once it is saved.');
        }

        return $key;
    }

    public function hasPhoto(): bool
    {
        return $this->print_path !== null;
    }

    /**
     * @return array<string, string>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'width' => 'integer',
            'height' => 'integer',
            'bytes' => 'integer',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
