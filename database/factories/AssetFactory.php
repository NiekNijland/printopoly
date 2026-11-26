<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Asset;
use Illuminate\Database\Eloquent\Factories\Factory;
use Override;

/**
 * @extends Factory<Asset>
 */
final class AssetFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    #[Override]
    public function definition(): array
    {
        return [
            'ref' => fake()->unique()->bothify('asset-########'),
            'user_id' => null,
            'edition_id' => null,
            'print_job_id' => null,
            'disk' => 'local',
            'preview_path' => 'assets/preview.webp',
            'print_path' => 'assets/print.jpg',
            'width' => 1200,
            'height' => 800,
            'original_width' => 1200,
            'original_height' => 800,
            'bytes' => 1000,
            'checksum' => fake()->sha256(),
        ];
    }
}
