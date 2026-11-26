<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Edition;
use Illuminate\Database\Eloquent\Factories\Factory;
use Override;

/**
 * @extends Factory<Edition>
 */
final class EditionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    #[Override]
    public function definition(): array
    {
        return [
            'user_id' => fake()->uuid(),
            'edition_id' => fake()->uuid(),
            'schema_version' => 1,
            'name' => fake()->words(2, true),
            'language' => 'nl',
            'currency' => 'M',
            'theme' => 'vintage',
            'parts' => ['cards' => true, 'pawns' => true],
            'elements' => [],
            'revision' => 1,
            'created_at_ms' => 0,
            'updated_at_ms' => 0,
        ];
    }
}
