<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\BoxContribution;
use Illuminate\Database\Eloquent\Factories\Factory;
use Override;

/**
 * @extends Factory<BoxContribution>
 */
final class BoxContributionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    #[Override]
    public function definition(): array
    {
        return [
            'box_id' => fake()->uuid(),
            'element_key' => 'space.1',
            'first_name' => fake()->firstName(),
            'value' => fake()->city(),
            'receipt' => fake()->unique()->bothify('receipt-########'),
            'bytes' => 0,
        ];
    }
}
