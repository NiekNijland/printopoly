<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Modules\Editions\Support\PartStyles;
use Tests\TestCase;

final class PartStylesTest extends TestCase
{
    public function test_the_styles_come_from_the_file_the_browser_reads(): void
    {
        $file = json_decode((string) file_get_contents(resource_path(PartStyles::FILE)), true, 8, JSON_THROW_ON_ERROR);

        self::assertSame($file, PartStyles::all());
        self::assertSame(['vintage', 'modern', 'playful'], PartStyles::idsFor('boxLid'));
        self::assertSame([], PartStyles::idsFor('houseRules'));
    }

    public function test_a_style_key_names_its_part_in_the_spelling_of_the_file(): void
    {
        self::assertSame('boxLid', PartStyles::partOfKey('style.box_lid'));
        self::assertSame('board', PartStyles::partOfKey('style.board'));
        self::assertNull(PartStyles::partOfKey('style.boxLid'));
        self::assertNull(PartStyles::partOfKey('style.board.extra'));
        self::assertNull(PartStyles::partOfKey('space.board'));
        self::assertNull(PartStyles::partOfKey('style'));
    }

    public function test_only_a_known_style_of_the_part_is_a_style(): void
    {
        self::assertTrue(PartStyles::isStyle('style.cards', 'modern'));
        self::assertTrue(PartStyles::isStyle('style.box_lid', 'playful'));
        self::assertFalse(PartStyles::isStyle('style.cards', 'neon'));
        self::assertFalse(PartStyles::isStyle('style.cards', 1));
        self::assertFalse(PartStyles::isStyle('space.01', 'modern'));
    }
}
