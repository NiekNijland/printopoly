<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use App\Modules\Content\Enums\Locale;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;
use Override;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    #[Override]
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'google_id' => fake()->unique()->numerify('1##################'),
            'locale' => Locale::DUTCH->value,
            'remember_token' => Str::random(10),
        ];
    }
}
