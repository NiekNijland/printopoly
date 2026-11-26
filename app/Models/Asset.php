<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\AssetFactory;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use LogicException;
use MongoDB\Laravel\Eloquent\Model;
use Override;

/**
 * An uploaded photo with its two derived images (B61): a preview and a print
 * source. The original is never kept. An asset belongs to a user (and edition)
 * or, for a job without an account, to that print job only (B80).
 *
 * `ref` is the id the edition JSON uses for this photo. The browser picks it,
 * so an edition keeps pointing at the right photo wherever it is stored.
 *
 * @property string $id
 * @property string $ref
 * @property string|null $user_id
 * @property string|null $edition_id
 * @property string|null $print_job_id
 * @property string $disk
 * @property string $preview_path
 * @property string $print_path
 * @property int $width Print source width in pixels, after orientation.
 * @property int $height Print source height in pixels, after orientation.
 * @property int $original_width
 * @property int $original_height
 * @property int $bytes Preview plus print source.
 * @property string $checksum Of the print source; part of the cache key (B62).
 * @property CarbonImmutable|null $expires_at Set for assets that belong to an anonymous job.
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Connection('mongodb')]
#[Fillable([
    'ref',
    'user_id',
    'edition_id',
    'print_job_id',
    'disk',
    'preview_path',
    'print_path',
    'width',
    'height',
    'original_width',
    'original_height',
    'bytes',
    'checksum',
    'expires_at',
])]
#[Table(name: 'assets')]
final class Asset extends Model
{
    /** @use HasFactory<AssetFactory> */
    use HasFactory;

    public function publicId(): string
    {
        $key = $this->getKey();

        throw_unless(is_string($key), LogicException::class, 'An asset only has an id once it is saved.');

        return $key;
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
            'original_width' => 'integer',
            'original_height' => 'integer',
            'bytes' => 'integer',
            'expires_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
