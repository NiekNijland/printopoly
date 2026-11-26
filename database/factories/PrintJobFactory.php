<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PrintJob;
use Illuminate\Database\Eloquent\Factories\Factory;
use Override;

/**
 * @extends Factory<PrintJob>
 */
final class PrintJobFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    #[Override]
    public function definition(): array
    {
        return [
            'token' => fake()->unique()->bothify('print-token-########'),
            'user_id' => null,
            'edition_id' => null,
            'edition' => ['name' => fake()->words(2, true), 'language' => 'nl', 'elements' => []],
            'locale' => 'nl',
            'states' => [],
        ];
    }
}
