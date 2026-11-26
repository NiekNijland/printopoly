<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\CollectionBox;
use Illuminate\Database\Eloquent\Factories\Factory;
use Override;

/**
 * @extends Factory<CollectionBox>
 */
final class CollectionBoxFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    #[Override]
    public function definition(): array
    {
        return [
            'token' => fake()->unique()->bothify('box-token-########'),
            'owner_hash' => fake()->sha256(),
            'channel' => fake()->unique()->bothify('channel-########'),
            'user_id' => null,
            'edition_id' => fake()->uuid(),
            'edition_name' => fake()->words(2, true),
            'language' => 'nl',
            'snapshot' => ['theme' => 'vintage', 'currency' => null, 'parts' => ['cards' => true, 'pawns' => true], 'elements' => []],
            'status' => 'open',
            'accepted_count' => 0,
            'rejected_count' => 0,
            'last_activity_at' => now()->toImmutable(),
            'expires_at' => now()->addDays(30)->toImmutable(),
        ];
    }
}
