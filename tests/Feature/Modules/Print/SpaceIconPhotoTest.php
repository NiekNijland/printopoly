<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print;

use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Support\PrintEditionData;
use Tests\TestCase;

/**
 * An uploaded image on a special space (B136) sits in `icon.photo`: it is cropped like any other photo, to the
 * frame the browser measured, and the deeds and card backs get it too.
 */
final class SpaceIconPhotoTest extends TestCase
{
    private function edition(): PrintEditionData
    {
        $photo = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

        return PrintEditionData::fromArray(['name' => 'Test', 'elements' => [
            'space.12' => ['icon' => ['photo' => $photo, 'aspect' => 2]],
            'space.05' => ['icon' => ['preset' => 'ferry'], 'name' => 'Veer'],
            'space.07' => ['icon' => ['preset' => 'clover']],
        ]]);
    }

    public function test_an_uploaded_icon_is_cropped_to_its_measured_frame(): void
    {
        $edition = $this->edition()->withTargets(['space.12#icon' => ['w' => 16, 'h' => 8]]);
        $placements = $edition->placements();

        self::assertCount(1, $placements);
        self::assertSame('space.12#icon', $placements[0]->key);
        self::assertSame(16.0, $placements[0]->targetWidthMm);
        self::assertSame(8.0, $placements[0]->targetHeightMm);

        $payload = $edition->toPrintPayload(['space.12#icon' => 'https://example.test/icon.png']);
        $json = (string) json_encode($payload['elements'], JSON_UNESCAPED_SLASHES);

        self::assertStringContainsString('"icon":{"photo":{"photoId":"photo-ref-0001"', $json);
        self::assertStringContainsString('"src":"https://example.test/icon.png"', $json);
        self::assertStringContainsString('"aspect":2', $json);
    }

    public function test_an_icon_without_a_target_is_not_cropped(): void
    {
        self::assertSame([], $this->edition()->withTargets([])->placements());
    }

    public function test_the_cards_part_gets_the_icons_of_the_spaces_for_deeds_and_card_backs(): void
    {
        $elements = $this->edition()->onlyFor(PrintPart::Cards)->elements;

        self::assertSame(['name' => 'Veer', 'icon' => ['preset' => 'ferry']], $elements['space.05']);
        self::assertSame(['icon' => ['preset' => 'clover']], $elements['space.07']);
        self::assertArrayHasKey('icon', $elements['space.12']);
        self::assertArrayNotHasKey('space.05', $this->edition()->onlyFor(PrintPart::Money)->elements);
    }
}
