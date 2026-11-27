<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Content\Support;

use App\Modules\Content\Data\ContentSectionData;
use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Support\PrintGuide;
use App\Modules\Print\Support\PartText;
use Tests\TestCase;

final class PrintGuideTest extends TestCase
{
    public function test_the_parts_line_becomes_a_section_per_part_in_guide_order(): void
    {
        $markdown = resolve(PrintGuide::class)->markdown(Locale::Dutch);

        self::assertStringNotContainsString('{parts}', $markdown);
        $positions = [];

        foreach (PartText::GUIDE_ORDER as $part) {
            $position = strpos($markdown, '{#part-' . $part->value . '}');
            self::assertNotFalse($position, 'no section for ' . $part->value);
            $positions[] = $position;
        }

        $sorted = $positions;
        sort($sorted);
        self::assertSame($sorted, $positions);
    }

    public function test_the_guide_page_links_each_part_by_its_id_in_both_languages(): void
    {
        foreach (Locale::cases() as $locale) {
            $ids = array_map(static fn (ContentSectionData $section): string => $section->id, resolve(PrintGuide::class)->page($locale)->sections);

            foreach (PartText::GUIDE_ORDER as $part) {
                self::assertContains('part-' . $part->value, $ids);
            }
        }
    }

    public function test_the_placeholders_of_the_part_texts_are_filled(): void
    {
        $markdown = resolve(PrintGuide::class)->markdown(Locale::English);

        self::assertSame(0, preg_match('/\{[a-z_]+\}/', $markdown));
    }
}
