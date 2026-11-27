<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\ValueObjects;

use App\Modules\Photos\ValueObjects\PhotoPlacement;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintEditionReader;
use Tests\TestCase;

final class EditionPhotosTest extends TestCase
{
    private const array PHOTO = ['photoId' => 'photo-ref-0001', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];

    public function test_the_placements_are_the_photos_the_icons_and_the_photo_layers_in_key_order(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => [
            'space.05' => ['photo' => self::PHOTO, 'layers' => [
                ['id' => 'l1', 'kind' => 'photo', 'photo' => self::PHOTO],
                ['id' => 'l2', 'kind' => 'text', 'photo' => self::PHOTO],
                'not a layer',
            ]],
            'space.02' => ['icon' => ['photo' => self::PHOTO]],
            'board_center' => ['background' => self::PHOTO, 'photo' => 'not a photo'],
        ]]);

        $keys = array_map(static fn (PhotoPlacement $placement): string => $placement->key, $edition->placements());

        self::assertSame(['board_center#background', 'deed.03#photo', 'space.02#icon', 'space.05#photo', 'space.05#layer:l1'], $keys);
    }

    public function test_the_print_payload_carries_the_photo_sources_and_the_money_left_out(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['name' => 'Club', 'language' => 'nl', 'theme' => 'classic', 'currency' => 'eur', 'parts' => ['money' => true], 'elements' => [
            'space.02' => ['icon' => ['id' => 'star', 'photo' => self::PHOTO]],
            'space.05' => ['photo' => self::PHOTO, 'layers' => [['id' => 'l1', 'kind' => 'photo', 'photo' => self::PHOTO]]],
        ]])->forSet(PrintSet::HOME, null, moneyLeftOut: true, sets: 2);

        $payload = $edition->toPrintPayload(['space.02#icon' => 'icon.jpg', 'space.05#photo' => 'photo.jpg', 'space.05#layer:l1' => 'layer.jpg']);
        $elements = (array) $payload['elements'];

        self::assertSame(['name', 'language', 'theme', 'currency', 'boardProfile', 'parts', 'moneyAmount', 'sets', 'boardForm', 'elements'], array_keys($payload));
        self::assertSame(['money' => false], (array) $payload['parts']);
        self::assertSame(['four', 2, 'panels'], [$payload['moneyAmount'], $payload['sets'], $payload['boardForm']]);
        self::assertSame(['icon' => ['id' => 'star', 'photo' => [...self::PHOTO, 'src' => 'icon.jpg']]], $elements['space.02']);
        self::assertSame([
            'photo' => [...self::PHOTO, 'src' => 'photo.jpg'],
            'layers' => [['id' => 'l1', 'kind' => 'photo', 'photo' => [...self::PHOTO, 'src' => 'layer.jpg']]],
        ], $elements['space.05']);
    }

    public function test_a_target_out_of_range_is_dropped_from_the_placement(): void
    {
        $edition = resolve(PrintEditionReader::class)->fromArray(['elements' => [
            'space.01' => ['photo' => [...self::PHOTO, 'target' => ['w' => 1, 'h' => 1]]],
            'space.02' => ['icon' => ['id' => 'star', 'photo' => self::PHOTO]],
        ]])->withTargets(['space.01#photo' => ['w' => 2001, 'h' => 10], 'space.02#icon' => ['w' => 20, 'h' => 20]]);

        self::assertTrue($edition->targetsDeclared);
        self::assertSame(self::PHOTO, $edition->elements['space.01']['photo']);
        self::assertSame(['id' => 'star', 'photo' => [...self::PHOTO, 'target' => ['w' => 20.0, 'h' => 20.0]]], $edition->elements['space.02']['icon']);
        self::assertSame(['space.02#icon'], array_map(static fn (PhotoPlacement $placement): string => $placement->key, $edition->placements()));
    }
}
