<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\PrintFile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Override;

/**
 * @extends Factory<PrintFile>
 */
final class PrintFileFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    #[Override]
    public function definition(): array
    {
        return [
            'print_job_id' => fake()->uuid(),
            'kind' => 'part',
            'part' => 'cards',
            'set' => 'home',
            'cache_key' => fake()->sha256(),
            'disk' => 'local',
            'path' => 'print/cards.pdf',
            'filename' => 'cards.pdf',
            'bytes' => 1000,
            'pages' => 1,
            'expires_at' => now()->addDays(7)->toImmutable(),
        ];
    }
}
