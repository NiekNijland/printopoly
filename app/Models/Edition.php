<?php

declare(strict_types=1);

namespace App\Models;

use App\Modules\Editions\Support\EditionValidator;
use Database\Factories\EditionFactory;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Auth;
use MongoDB\Laravel\Eloquent\Model;
use Override;

/**
 * An edition of a logged-in user (B60). `elements` is an object with fixed
 * keys (`space.01`, `box_lid`) and holds only what differs from the standard
 * data (B59). `revision` goes up on every saved change and is the check that
 * keeps two windows from overwriting each other (B81).
 *
 * The browser makes the id (`edition_id`), so a local edition keeps its id
 * when it moves into the account. The document `_id` stays an ObjectId.
 *
 * @phpstan-import-type Profile from EditionValidator
 *
 * @property string $id
 * @property string $user_id
 * @property string $edition_id
 * @property int $schema_version
 * @property string $name
 * @property string $language
 * @property string $currency
 * @property string $theme
 * @property Profile $board_profile
 * @property array<string, bool> $parts
 * @property array<string, array<string, mixed>> $elements
 * @property string|null $template
 * @property string|null $money_amount How much play money to print (B156); null for the default of each set.
 * @property array<string, mixed>|null $print_selection What goes in the print set (B198), see PrintSelection.
 * @property int $revision
 * @property int $created_at_ms
 * @property int $updated_at_ms
 */
#[Connection('mongodb')]
#[Fillable([
    'user_id',
    'edition_id',
    'schema_version',
    'name',
    'language',
    'currency',
    'theme',
    'board_profile',
    'parts',
    'elements',
    'template',
    'money_amount',
    'print_selection',
    'revision',
    'created_at_ms',
    'updated_at_ms',
])]
#[RouteKey('edition_id')]
#[Table(name: 'editions')]
#[WithoutTimestamps]
final class Edition extends Model
{
    /** @use HasFactory<EditionFactory> */
    use HasFactory;

    /**
     * A user only ever resolves their own editions: someone else's id is
     * simply not found, so it cannot be told from an id that does not exist.
     *
     * @param mixed $value
     * @param string|null $field
     */
    #[Override]
    public function resolveRouteBinding($value, $field = null): ?self
    {
        $user = Auth::user();

        if (! $user instanceof User || ! is_string($value)) {
            return null;
        }

        return self::query()
            ->where('user_id', $user->publicId())
            ->where('edition_id', $value)
            ->first();
    }

    /**
     * @return array<string, string>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'schema_version' => 'integer',
            'revision' => 'integer',
            'created_at_ms' => 'integer',
            'updated_at_ms' => 'integer',
        ];
    }
}
