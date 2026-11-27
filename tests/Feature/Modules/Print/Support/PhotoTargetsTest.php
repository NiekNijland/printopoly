<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Support\DeedPhotos;
use App\Modules\Print\Support\PhotoTargets;
use App\Modules\Print\Support\PrintEditionReader;
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

    public function test_targets_become_the_frame_of_each_placement(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray($this->edition())->withTargets(['space.01#photo' => ['w' => 45, 'h' => 75]]);

        $placements = $edition->placements();

        self::assertCount(1, $placements);
        self::assertSame('space.01#photo', $placements[0]->key);
        self::assertSame(45.0, $placements[0]->targetWidthMm);
        self::assertSame(75.0, $placements[0]->targetHeightMm);
    }

    public function test_the_background_photo_of_the_board_centre_is_cropped_to_its_own_target(): void
    {
        $photo = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition = resolve(PrintEditionReader::class)->fromArray(['name' => 'Test', 'elements' => ['board_center' => ['background' => $photo]]])
            ->withTargets(['board_center#background' => ['w' => 360, 'h' => 360]]);

        $placements = $edition->placements();

        self::assertCount(1, $placements);
        self::assertSame('board_center#background', $placements[0]->key);
        self::assertSame(360.0, $placements[0]->targetWidthMm);

        $payload = $edition->toPrintPayload(['board_center#background' => 'https://example.test/c.jpg']);

        self::assertStringContainsString('"background":{', (string) json_encode($payload['elements'] ?? null));
        self::assertStringContainsString('https://example.test/c.jpg', (string) json_encode($payload['elements'] ?? null, JSON_UNESCAPED_SLASHES));
    }

    public function test_a_photo_without_a_target_is_not_cropped_once_the_browser_has_spoken(): void
    {
        $declared = resolve(PrintEditionReader::class)->fromArray($this->edition())->withTargets([]);
        $undeclared = resolve(PrintEditionReader::class)->fromArray($this->edition());

        self::assertSame([], $declared->placements());
        // Two spaces with a photo, and their two title deeds that show it too (B157).
        self::assertCount(4, $undeclared->placements());
    }

    public function test_absurd_sizes_are_not_trusted(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray($this->edition())->withTargets([
            'space.01#photo' => ['w' => 100000, 'h' => 75],
            'space.05#photo' => ['w' => -3, 'h' => 75],
        ]);

        self::assertSame([], $edition->placements());
    }

    public function test_the_targets_are_part_of_what_changes_the_picture(): void
    {
        $small = resolve(PrintEditionReader::class)->fromArray($this->edition())->withTargets(['space.01#photo' => ['w' => 45, 'h' => 75]]);
        $large = resolve(PrintEditionReader::class)->fromArray($this->edition())->withTargets(['space.01#photo' => ['w' => 60, 'h' => 75]]);

        self::assertNotSame($small->toCacheArray(), $large->toCacheArray());
    }

    public function test_clean_keeps_only_well_formed_targets_per_set(): void
    {
        $clean = PhotoTargets::clean([
            'printer' => ['space.01#photo' => ['w' => '45', 'h' => 75], 'bad' => 'x', 'worse' => ['w' => 'a', 'h' => 1]],
            'home' => 'nope',
            'other' => ['space.01#photo' => ['w' => 1, 'h' => 1]],
        ]);

        self::assertSame(['printer', 'home'], array_keys($clean));
        self::assertSame(['space.01#photo' => ['w' => 45.0, 'h' => 75.0]], $clean['printer']);
        self::assertSame([], $clean['home']);
        self::assertSame(['printer' => [], 'home' => []], PhotoTargets::clean([]));
    }

    public function test_a_deed_shows_the_photo_of_its_space_unless_told_otherwise(): void
    {
        $photo = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.4, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $own = [...$photo, 'photoId' => 'photo-ref-0002'];

        $elements = resolve(DeedPhotos::class)->withDeedPhotos([
            // Street 1 is deed 1: it gets the photo of the space, with its style.
            'space.01' => ['photo' => $photo, 'photoStyle' => 'full'],
            // Station 5 is deed 3: the deed has its own photo, which stays.
            'space.05' => ['photo' => $photo],
            'deed.03' => ['photo' => $own],
            // Street 3 is deed 2: the space keeps its photo off the deed.
            'space.03' => ['photo' => $photo, 'deedPhoto' => false],
            // Tax 4 has no deed.
            'space.04' => ['photo' => $photo],
        ]);

        self::assertSame($photo, $elements['deed.01']['photo'] ?? null);
        self::assertSame('full', $elements['deed.01']['photoStyle'] ?? null);
        self::assertSame($own, $elements['deed.03']['photo'] ?? null);
        self::assertArrayNotHasKey('deed.02', $elements);
        self::assertCount(6, $elements);
    }

    public function test_the_invitation_carries_the_whole_board_with_its_photos(): void
    {
        $photo = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition = resolve(PrintEditionReader::class)->fromArray(['name' => 'Test', 'parts' => ['invitation' => true], 'elements' => [
            'space.01' => ['photo' => $photo, 'name' => 'Kerkstraat'],
            'board_center' => ['background' => $photo, 'subtitle' => 'Ons dorp'],
            'group.brown' => ['color' => '#123456'],
            'invitation' => ['name' => 'Kom spelen'],
        ]])->onlyFor(PrintPart::INVITATION);

        $json = (string) json_encode($edition->toPrintPayload([])['elements']);

        self::assertStringContainsString('"background":{', $json);
        self::assertStringContainsString('#123456', $json);
        self::assertStringContainsString('"photo":{', $json);
        self::assertStringContainsString('Kom spelen', $json);
    }
}
