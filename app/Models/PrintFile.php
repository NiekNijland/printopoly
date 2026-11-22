<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PrintPart;
use Carbon\CarbonImmutable;
use MongoDB\Laravel\Eloquent\Model;
use Override;

/**
 * A generated PDF (B60). It belongs to a hash of the edition data, the assets,
 * the profile and the release version (B62) and goes away after 7 days.
 *
 * @property string $id
 * @property string $print_job_id
 * @property string $kind 'part' for a production PDF, 'instructions' for the instruction PDF of a part, 'image' for a PNG.
 * @property string $part
 * @property string|null $set Null for instruction PDFs: they cover both sets.
 * @property string $cache_key
 * @property string $disk
 * @property string $path
 * @property string $filename
 * @property int $bytes
 * @property int $pages
 * @property CarbonImmutable $expires_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
class PrintFile extends Model
{
    public const string KIND_PART = 'part';

    public const string KIND_INSTRUCTIONS = 'instructions';

    /** The PNG of the invitation (B123), next to its PDF. */
    public const string KIND_IMAGE = 'image';

    /** The order sheet of a set (B185), first in its ZIP. Its `part` is `order_sheet`. */
    public const string KIND_ORDER_SHEET = 'order_sheet';

    #[Override]
    protected $connection = 'mongodb';

    #[Override]
    protected $table = 'print_files';

    /** @var list<string> */
    #[Override]
    protected $fillable = [
        'print_job_id',
        'kind',
        'part',
        'set',
        'cache_key',
        'disk',
        'path',
        'filename',
        'bytes',
        'pages',
        'expires_at',
    ];

    public function printPart(): PrintPart
    {
        return PrintPart::from($this->part);
    }

    /**
     * @return array<string, string>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'bytes' => 'integer',
            'pages' => 'integer',
            'expires_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
