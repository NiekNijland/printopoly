<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use LogicException;
use MongoDB\Laravel\Eloquent\Model;
use Override;

/**
 * The collection box of one edition ("Samen maken", B128). Friends open it with the secret `token`
 * in their link and can only add to it. The owner is whoever holds the owner secret (kept in their
 * browser, only its hash is stored here) or, for a box made while logged in, the account that made it.
 *
 * `snapshot` is not the edition: it holds the names of spaces, cards and pawns, so friends see what
 * they are adding to, and nothing else. The box expires `retention_days` after its last activity.
 *
 * @property string $id
 * @property string $token Secret in the friends' link.
 * @property string $owner_hash Hash of the owner secret.
 * @property string $channel Unguessable name of the owner's live channel; friends never learn it.
 * @property string|null $user_id
 * @property string $edition_id The edition id the owner's browser uses.
 * @property string $edition_name
 * @property string $language
 * @property array{theme: string, currency: string|null, parts: array{cards: bool, pawns: bool}, elements: array<string, array{name?: string, text?: string, town?: string, added?: true}>} $snapshot
 * @property string $status 'open' or 'closed'.
 * @property int $accepted_count
 * @property int $rejected_count
 * @property array<string, string>|null $outcomes Per receipt of a contribution that is gone: `applied` when something
 *                                                of it went into the edition, `passed` when not (B175). Friends see it.
 * @property bool|null $cards_hidden Friends see no card texts, only that the cards are there (B176).
 * @property list<string>|null $replaced_tokens Hashes of links that "Nieuwe link" replaced, so an old link can say so (B175).
 * @property string|null $ip_hash
 * @property CarbonImmutable $last_activity_at
 * @property CarbonImmutable $expires_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
class CollectionBox extends Model
{
    public const string OPEN = 'open';

    public const string CLOSED = 'closed';

    #[Override]
    protected $connection = 'mongodb';

    #[Override]
    protected $table = 'collection_boxes';

    /** @var list<string> */
    #[Override]
    protected $fillable = [
        'token',
        'owner_hash',
        'channel',
        'user_id',
        'edition_id',
        'edition_name',
        'language',
        'snapshot',
        'status',
        'accepted_count',
        'rejected_count',
        'outcomes',
        'replaced_tokens',
        'cards_hidden',
        'ip_hash',
        'last_activity_at',
        'expires_at',
    ];

    /** @var list<string> */
    #[Override]
    protected $hidden = [
        'owner_hash',
        'ip_hash',
        'channel',
        'replaced_tokens',
    ];

    public function publicId(): string
    {
        $key = $this->getKey();

        if (! is_string($key)) {
            throw new LogicException('A box only has an id once it is saved.');
        }

        return $key;
    }

    public const string REPLACED = 'replaced';

    /** How many replaced links a box remembers. */
    public const int REMEMBERED_TOKENS = 10;

    public static function tokenHash(string $token): string
    {
        return hash('sha256', $token);
    }

    public function isOpen(): bool
    {
        return $this->status === self::OPEN && $this->expires_at->isFuture();
    }

    /**
     * @return array<string, string>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'accepted_count' => 'integer',
            'rejected_count' => 'integer',
            'cards_hidden' => 'boolean',
            'last_activity_at' => 'immutable_datetime',
            'expires_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
