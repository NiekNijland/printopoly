<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Print\PhotoTargets;
use App\Print\PrintEditionData;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class PhotoTargetsTest extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    private function edition(): array
    {
        $photo = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

        return [
            'name' => 'Test',
            'elements' => [
                'space.01' => ['photo' => $photo],
                'space.05' => ['photo' => $photo],
            ],
        ];
    }

    #[Test]
    public function targets_become_the_frame_of_each_placement(): void
    {
        $edition = PrintEditionData::fromArray($this->edition())->withTargets(['space.01#photo' => ['w' => 45, 'h' => 75]]);

        $placements = $edition->placements();

        self::assertCount(1, $placements);
        self::assertSame('space.01#photo', $placements[0]->key);
        self::assertSame(45.0, $placements[0]->targetWidthMm);
        self::assertSame(75.0, $placements[0]->targetHeightMm);
    }

    #[Test]
    public function the_background_photo_of_the_board_centre_is_cropped_to_its_own_target(): void
    {
        $photo = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition = PrintEditionData::fromArray(['name' => 'Test', 'elements' => ['board_center' => ['background' => $photo]]])
            ->withTargets(['board_center#background' => ['w' => 360, 'h' => 360]]);

        $placements = $edition->placements();

        self::assertCount(1, $placements);
        self::assertSame('board_center#background', $placements[0]->key);
        self::assertSame(360.0, $placements[0]->targetWidthMm);

        $payload = $edition->toPrintPayload(['board_center#background' => 'https://example.test/c.jpg']);

        self::assertStringContainsString('"background":{', (string) json_encode($payload['elements'] ?? null));
        self::assertStringContainsString('https://example.test/c.jpg', (string) json_encode($payload['elements'] ?? null));
    }

    #[Test]
    public function a_photo_without_a_target_is_not_cropped_once_the_browser_has_spoken(): void
    {
        $declared = PrintEditionData::fromArray($this->edition())->withTargets([]);
        $undeclared = PrintEditionData::fromArray($this->edition());

        self::assertSame([], $declared->placements());
        self::assertCount(2, $undeclared->placements());
    }

    #[Test]
    public function absurd_sizes_are_not_trusted(): void
    {
        $edition = PrintEditionData::fromArray($this->edition())->withTargets([
            'space.01#photo' => ['w' => 100000, 'h' => 75],
            'space.05#photo' => ['w' => -3, 'h' => 75],
        ]);

        self::assertSame([], $edition->placements());
    }

    #[Test]
    public function the_targets_are_part_of_what_changes_the_picture(): void
    {
        $small = PrintEditionData::fromArray($this->edition())->withTargets(['space.01#photo' => ['w' => 45, 'h' => 75]]);
        $large = PrintEditionData::fromArray($this->edition())->withTargets(['space.01#photo' => ['w' => 60, 'h' => 75]]);

        self::assertNotSame($small->toCacheArray(), $large->toCacheArray());
    }

    #[Test]
    public function clean_keeps_only_well_formed_targets_per_set(): void
    {
        $clean = PhotoTargets::clean([
            'printer' => ['space.01#photo' => ['w' => '45', 'h' => 75], 'bad' => 'x', 'worse' => ['w' => 'a', 'h' => 1]],
            'home' => 'nope',
            'other' => ['space.01#photo' => ['w' => 1, 'h' => 1]],
        ]);

        self::assertSame(['printer', 'home'], array_keys($clean));
        self::assertSame(['space.01#photo' => ['w' => 45.0, 'h' => 75.0]], $clean['printer']);
        self::assertSame([], $clean['home']);
        self::assertSame(['printer' => [], 'home' => []], PhotoTargets::clean(null));
    }
}
