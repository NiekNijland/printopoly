<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Validation\ValidationException;
use Tests\Support\Editions;
use Tests\TestCase;

final class ElementOptionsTest extends TestCase
{
    public function test_it_accepts_a_background_photo_on_the_board_centre_only(): void
    {
        $validator = resolve(EditionValidator::class);

        $photo = ['photoId' => 'p', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition = $validator->edition(Editions::payload('e1', ['elements' => ['board_center' => ['background' => $photo]]]));

        self::assertSame($photo, $edition['elements']['board_center']['background']);

        $this->expectException(ValidationException::class);

        $validator->edition(Editions::payload('e1', ['elements' => ['box_lid' => ['background' => $photo]]]));
    }

    public function test_it_accepts_the_title_options_of_the_board_centre(): void
    {
        $validator = resolve(EditionValidator::class);

        $options = ['centerMode' => 'logo', 'subtitle' => '', 'photoAspect' => 2.5, 'photoFrame' => false];
        $edition = $validator->edition(Editions::payload('e1', ['elements' => ['board_center' => $options]]));

        self::assertSame($options, $edition['elements']['board_center']);
    }

    public function test_it_accepts_the_photo_title_and_text_options_of_ronde_3(): void
    {
        $validator = resolve(EditionValidator::class);

        $photo = ['photoId' => 'p1', 'cx' => 0.5, 'cy' => 0.3, 'scale' => 0.6, 'rotation' => 0, 'grayscale' => false, 'fit' => true];
        $layer = ['id' => 'l', 'x' => 1, 'y' => 2, 'w' => 30, 'h' => 8, 'kind' => 'text', 'text' => 'Kerst', 'color' => '#FFFFFF', 'font' => 'mono', 'align' => 'left'];
        $elements = [
            'space.01' => ['photo' => $photo, 'deedPhoto' => false],
            'deed.01' => ['text' => 'Hier stond de bakkerij van opa.'],
            'board_center' => ['titleOffset' => -0.5, 'titleScale' => 0.7, 'titleHidden' => true],
            'box_lid' => ['subtitle' => '', 'text' => 'Kerst 2026', 'titleOffset' => 1, 'titleBand' => false, 'layers' => [$layer]],
            'invitation' => ['name' => 'Kom spelen', 'subtitle' => 'Zaterdag'],
        ];
        $edition = $validator->edition(Editions::payload('e1', ['elements' => $elements]));

        self::assertSame($elements, $edition['elements']);
    }

    public function test_it_accepts_a_title_style_on_the_board_centre_and_the_box_lid(): void
    {
        $validator = resolve(EditionValidator::class);

        foreach (['ribbon', 'stamp', 'bar', 'script', 'plain'] as $style) {
            $elements = ['board_center' => ['titleStyle' => $style], 'box_lid' => ['titleStyle' => $style]];
            $edition = $validator->edition(Editions::payload('e1', ['elements' => $elements]));

            self::assertSame($elements, $edition['elements']);
        }
    }

    public function test_it_accepts_the_style_of_the_board_b268(): void
    {
        $validator = resolve(EditionValidator::class);

        foreach (['vintage', 'modern', 'playful'] as $style) {
            $elements = ['style.board' => ['style' => $style]];
            $edition = $validator->edition(Editions::payload('e1', ['elements' => $elements]));

            self::assertSame($elements, $edition['elements']);
        }
    }

    public function test_it_accepts_the_style_of_the_cards_and_the_deeds_b269(): void
    {
        $validator = resolve(EditionValidator::class);

        foreach (['vintage', 'modern', 'playful'] as $style) {
            $elements = ['style.cards' => ['style' => $style], 'style.deeds' => ['style' => $style]];
            $edition = $validator->edition(Editions::payload('e1', ['elements' => $elements]));

            self::assertSame($elements, $edition['elements']);
        }
    }

    public function test_it_accepts_the_place_of_the_centre_and_a_tilted_logo_of_ronde_4(): void
    {
        $validator = resolve(EditionValidator::class);

        foreach (['bottomLeft', 'middle'] as $place) {
            $elements = ['board_center' => ['centerMode' => 'logo', 'centerPlace' => $place, 'logoTilt' => true]];
            $edition = $validator->edition(Editions::payload('e1', ['elements' => $elements]));

            self::assertSame($elements, $edition['elements']);
        }
    }

    public function test_it_accepts_an_icon_or_an_uploaded_image_on_a_special_space(): void
    {
        $validator = resolve(EditionValidator::class);

        $photo = ['photoId' => 'p1', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
        $edition = $validator->edition(Editions::payload('e1', ['elements' => [
            'space.30' => ['icon' => ['preset' => 'handcuffs']],
            'space.05' => ['icon' => ['preset' => 'ferry'], 'name' => 'Veer'],
            'space.04' => ['icon' => ['preset' => 'piggy-bank']],
            'space.12' => ['icon' => ['photo' => $photo, 'aspect' => 1.5]],
        ]]));

        self::assertSame(['preset' => 'handcuffs'], $edition['elements']['space.30']['icon']);
        self::assertSame(['icon' => ['preset' => 'ferry'], 'name' => 'Veer'], $edition['elements']['space.05']);
        self::assertSame(['preset' => 'piggy-bank'], $edition['elements']['space.04']['icon']);
        self::assertSame(['photo' => $photo, 'aspect' => 1.5], $edition['elements']['space.12']['icon']);
    }

    public function test_it_accepts_a_photo_style_where_a_photo_can_be_full(): void
    {
        $validator = resolve(EditionValidator::class);

        $edition = $validator->edition(Editions::payload('e1', [
            'elements' => [
                'space.01' => ['photoStyle' => 'full', 'layout' => 'text'],
                'deed.01' => ['photoStyle' => 'framed'],
                'card.chance.01' => ['photoStyle' => 'full'],
                'note.5' => ['photoStyle' => 'full'],
                'pawn.01' => ['photoStyle' => 'full'],
                'box_lid' => ['photoStyle' => 'full'],
            ],
        ]));

        self::assertSame(['photoStyle' => 'full'], $edition['elements']['space.01']);
        self::assertSame(['photoStyle' => 'framed'], $edition['elements']['deed.01']);
        self::assertSame(['photoStyle' => 'full'], $edition['elements']['box_lid']);
    }
}
