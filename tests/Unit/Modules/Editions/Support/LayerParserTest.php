<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\LayerParser;
use App\Modules\Editions\Support\PhotoParser;
use PHPUnit\Framework\TestCase;

final class LayerParserTest extends TestCase
{
    private const array BOX = ['id' => 'l1', 'x' => 1, 'y' => 2, 'w' => 3, 'h' => 4];

    public function test_text_and_photo_layers_keep_their_fields(): void
    {
        $photo = ['photoId' => 'p', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $errors = [];

        $layers = new LayerParser(new PhotoParser())->parse([
            [...self::BOX, 'kind' => 'text', 'text' => 'Hoi', 'font' => 'mono', 'other' => true],
            [...self::BOX, 'rotation' => -3, 'kind' => 'photo', 'photo' => $photo],
        ], 'layers', $errors);

        self::assertSame([
            [...self::BOX, 'kind' => 'text', 'text' => 'Hoi', 'font' => 'mono'],
            [...self::BOX, 'rotation' => -3, 'kind' => 'photo', 'photo' => $photo],
        ], $layers);
        self::assertSame([], $errors);
    }

    public function test_one_wrong_layer_refuses_the_list_and_names_its_index(): void
    {
        $errors = [];

        self::assertNull(new LayerParser(new PhotoParser())->parse([[...self::BOX, 'kind' => 'text', 'text' => 'x'], [...self::BOX, 'kind' => 'text', 'text' => 'x', 'color' => '#fff']], 'layers', $errors));
        self::assertSame(['layers[1]: color must be like #FFFDF7, font heading, body or mono, align left, center or right'], $errors);
    }

    public function test_an_empty_list_is_kept_and_twenty_five_layers_are_too_many(): void
    {
        $errors = [];
        $parser = new LayerParser(new PhotoParser());

        self::assertSame([], $parser->parse([], 'layers', $errors));
        self::assertNull($parser->parse(array_fill(0, 25, [...self::BOX, 'kind' => 'text', 'text' => 'x']), 'layers', $errors));
        self::assertSame(['layers: must be a list of at most 24 layers'], $errors);
    }
}
