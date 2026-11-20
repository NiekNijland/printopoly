<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use LogicException;
use MongoDB\Laravel\Auth\User as Authenticatable;
use Override;

/**
 * An account exists only for people who log in with Google (B24, B78).
 * Google gives us the name and e-mail address and nothing else (B68).
 *
 * @property string $id
 * @property string $name
 * @property string $email
 * @property string $google_id
 * @property string|null $locale
 * @property string|null $remember_token
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    use Notifiable;

    #[Override]
    protected $connection = 'mongodb';

    #[Override]
    protected $table = 'users';

    /** @var list<string> */
    #[Override]
    protected $fillable = [
        'name',
        'email',
        'google_id',
        'locale',
    ];

    /** @var list<string> */
    #[Override]
    protected $hidden = [
        'google_id',
        'remember_token',
    ];

    /**
     * The document id as a string, for the frontend and for policies.
     */
    public function publicId(): string
    {
        $key = $this->getKey();

        if (! is_string($key)) {
            throw new LogicException('A user only has an id once it is saved.');
        }

        return $key;
    }

    /**
     * @return array<string, string>
     */
    #[Override]
    protected function casts(): array
    {
        return [
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }
}
