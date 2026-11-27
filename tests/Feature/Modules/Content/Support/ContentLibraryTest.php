<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Content\Support;

use App\Modules\Content\Data\FaqItemData;
use App\Modules\Content\Enums\Locale;
use App\Modules\Content\Support\ContentLibrary;
use RuntimeException;
use Tests\TestCase;

final class ContentLibraryTest extends TestCase
{
    public function test_a_page_takes_its_title_from_the_heading_and_its_seo_from_the_front_matter(): void
    {
        $page = resolve(ContentLibrary::class)->pageFrom(implode("\n", [
            '---',
            'title: Voorpagina',
            'seo_title: "Vragen over Printopoly"',
            'description: Alles over het spel',
            '---',
            '',
            '# Vragen',
            '',
            'Een **korte** inleiding.',
            '',
            '## Wat kost het?',
            '',
            'Niets.',
        ]));

        self::assertSame('Vragen', $page->title);
        self::assertSame('Vragen over Printopoly', $page->seoTitle);
        self::assertSame('Alles over het spel', $page->description);
        self::assertSame('<p>Een <strong>korte</strong> inleiding.</p>', $page->introHtml);
        self::assertCount(1, $page->sections);
        self::assertSame('wat-kost-het', $page->sections[0]->id);
        self::assertSame('Wat kost het?', $page->sections[0]->title);
        self::assertSame('<p>Niets.</p>', $page->sections[0]->html);
    }

    public function test_without_a_heading_or_front_matter_the_title_is_empty_and_the_seo_title_follows_the_title(): void
    {
        $bare = resolve(ContentLibrary::class)->pageFrom("Alleen tekst.\n");
        $fromFrontMatter = resolve(ContentLibrary::class)->pageFrom("---\ntitle: Privacy\n---\nTekst.\n");

        self::assertSame('', $bare->title);
        self::assertSame('', $bare->seoTitle);
        self::assertSame('', $bare->description);
        self::assertSame([], $bare->sections);
        self::assertSame('Privacy', $fromFrontMatter->title);
        self::assertSame('Privacy', $fromFrontMatter->seoTitle);
    }

    public function test_a_section_can_fix_its_own_id_and_holds_blocks_with_a_spec_and_steps(): void
    {
        $page = resolve(ContentLibrary::class)->pageFrom(implode("\n", [
            '# Printgids',
            '',
            '## Het bord {#part-board}',
            '',
            'Over het bord.',
            '',
            '### Wat je nodig hebt',
            '',
            '`A3, 200 gram`',
            '',
            '1. Print de vellen.',
            '2. Snijd **langs** de lijn.',
            '',
            '### Als het misgaat',
            '',
            'Kijk de schaal na.',
            '',
            '1. Een lijst in een tekst.',
        ]));

        $section = $page->sections[0];
        self::assertSame('part-board', $section->id);
        self::assertSame('Het bord', $section->title);
        self::assertSame('<p>Over het bord.</p>', $section->html);
        self::assertCount(2, $section->blocks);
        self::assertSame('Wat je nodig hebt', $section->blocks[0]->title);
        self::assertSame('A3, 200 gram', $section->blocks[0]->spec);
        self::assertSame(['Print de vellen.', 'Snijd <strong>langs</strong> de lijn.'], $section->blocks[0]->steps);
        self::assertSame('', $section->blocks[0]->html);
        self::assertNull($section->blocks[1]->spec);
        self::assertSame([], $section->blocks[1]->steps);
        self::assertStringContainsString('<ol>', $section->blocks[1]->html);
    }

    public function test_html_in_the_markdown_is_stripped_and_unsafe_links_dropped(): void
    {
        $page = resolve(ContentLibrary::class)->pageFrom("<script>alert(1)</script>\n\n[klik](javascript:alert(1))\n");

        self::assertStringNotContainsString('<script>', $page->introHtml);
        self::assertStringNotContainsString('javascript:', $page->introHtml);
    }

    public function test_the_faq_has_a_question_per_section_and_the_home_page_shows_five_of_them(): void
    {
        $library = resolve(ContentLibrary::class);

        $faq = $library->faq(Locale::DUTCH);
        $home = $library->homeFaq(Locale::DUTCH);

        self::assertCount(13, $faq);
        self::assertSame('Wat kost het?', $faq[0]->question);
        self::assertStringContainsString('gratis', $faq[0]->answerHtml);
        self::assertSame(
            [$faq[0]->question, $faq[1]->question, $faq[2]->question, $faq[5]->question, $faq[11]->question],
            array_map(static fn (FaqItemData $item): string => $item->question, $home),
        );
        self::assertSame(count($faq), count($library->faq(Locale::ENGLISH)));
    }

    public function test_the_landing_texts_are_the_strings_of_the_json_file(): void
    {
        $landing = resolve(ContentLibrary::class)->landing(Locale::ENGLISH);

        self::assertNotSame([], $landing);
        self::assertSame(array_keys($landing), array_keys(resolve(ContentLibrary::class)->landing(Locale::DUTCH)));
    }

    public function test_a_named_page_is_read_from_the_folder_of_its_language(): void
    {
        $page = resolve(ContentLibrary::class)->page('privacy', Locale::ENGLISH);

        self::assertNotSame('', $page->title);
        self::assertNotSame([], $page->sections);
    }

    public function test_a_missing_file_says_which_one(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Content file not found: nl/bestaat-niet.md');

        resolve(ContentLibrary::class)->page('bestaat-niet', Locale::DUTCH);
    }
}
