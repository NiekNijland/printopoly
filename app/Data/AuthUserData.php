<?php

declare(strict_types=1);

namespace App\Data;

use App\Models\User;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * The logged-in user as the frontend sees it. Only what the header needs.
 */
#[TypeScript]
final class AuthUserData extends Data
{
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly string $email,
    ) {
    }

    public static function fromUser(User $user): self
    {
        return new self(
            id: $user->publicId(),
            name: $user->name,
            email: $user->email,
        );
    }
}
