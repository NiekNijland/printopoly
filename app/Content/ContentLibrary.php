<?php

declare(strict_types=1);

namespace App\Content;

use App\Data\ContentBlockData;
use App\Data\ContentPageData;
use App\Data\ContentSectionData;
use App\Data\FaqItemData;
use App\Enums\Locale;
use Illuminate\Support\Str;
use JsonException;
use RuntimeException;

/**
 * Reads the texts in resources/content/{locale}. The files are the single
 * source: the site renders them here and the instruction PDF later uses the
 * same ones (B67).
 */
final class ContentLibrary
{
    /** Which questions of faq.md the landing page shows. */
    private const array HOME_FAQ_POSITIONS = [0, 1, 2, 6, 13];

    /** @var array<string, mixed> */
    private const array MARKDOWN_OPTIONS = [
        'html_input' => 'strip',
        'allow_unsafe_links' => false,
    ];

    public function page(string $name, Locale $locale): ContentPageData
    {
        return $this->pageFrom($this->read($locale->value . '/' . $name . '.md'));
    }

    /**
     * A page from markdown that was put together elsewhere, such as the print guide from the texts per part (B205).
     * A "##" heading may end in `{#id}` to fix the id of its section.
     */
    public function pageFrom(string $document): ContentPageData
    {
        [$frontMatter, $body] = $this->splitFrontMatter($document);

        $heading = '';
        $body = (string) preg_replace_callback(
            '/^# (.+)\R?/m',
            static function (array $match) use (&$heading): string {
                $heading = trim($match[1]);

                return '';
            },
            $body,
            1,
        );

        $parts = preg_split('/^## /m', $body);
        $parts = $parts === false ? [$body] : $parts;
        $intro = array_shift($parts) ?? '';
        $sections = [];

        foreach ($parts as $part) {
            $lines = explode("\n", $part, 2);
            $title = trim($lines[0]);
            $id = Str::slug($title);

            if (preg_match('/^(.*?)\s*\{#([a-z0-9_-]+)\}$/', $title, $own) === 1) {
                $title = $own[1];
                $id = $own[2];
            }

            $blocks = preg_split('/^### /m', $lines[1] ?? '');
            $blocks = $blocks === false ? [$lines[1] ?? ''] : $blocks;
            $text = array_shift($blocks) ?? '';
            $sections[] = new ContentSectionData(
                id: $id,
                title: $title,
                html: $this->markdown($text),
                blocks: array_map($this->block(...), $blocks),
            );
        }

        $title = $heading !== '' ? $heading : ($frontMatter['title'] ?? '');

        return new ContentPageData(
            title: $title,
            seoTitle: $frontMatter['seo_title'] ?? $title,
            description: $frontMatter['description'] ?? '',
            introHtml: $this->markdown($intro),
            sections: $sections,
        );
    }

    /**
     * The frequently asked questions: each "##" section is one question.
     *
     * @return list<FaqItemData>
     */
    public function faq(Locale $locale): array
    {
        return array_map(
            static fn (ContentSectionData $section): FaqItemData => new FaqItemData($section->title, $section->html),
            $this->page('faq', $locale)->sections,
        );
    }

    /**
     * The questions the landing page shows, by position in faq.md: cost,
     * account, which board, photos of friends, Hasbro. The rest is on the
     * FAQ page.
     *
     * @return list<FaqItemData>
     */
    public function homeFaq(Locale $locale): array
    {
        $faq = $this->faq($locale);

        return array_values(array_filter(
            array_map(static fn (int $position): ?FaqItemData => $faq[$position] ?? null, self::HOME_FAQ_POSITIONS),
        ));
    }

    /**
     * @return array<string, string>
     */
    public function landing(Locale $locale): array
    {
        try {
            $decoded = json_decode($this->read($locale->value . '/landing.json'), true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('landing.json is not valid JSON.', 0, $exception);
        }

        if (! is_array($decoded)) {
            throw new RuntimeException('landing.json must hold an object.');
        }

        $strings = [];

        foreach ($decoded as $key => $value) {
            if (is_string($key) && is_string($value)) {
                $strings[$key] = $value;
            }
        }

        return $strings;
    }

    private function block(string $part): ContentBlockData
    {
        $lines = explode("\n", $part, 2);
        $paragraphs = preg_split('/\R{2,}/', trim($lines[1] ?? ''));
        $paragraphs = $paragraphs === false ? [] : $paragraphs;
        $spec = null;
        $steps = [];
        $rest = [];

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);

            if ($spec === null && preg_match('/^`([^`]+)`$/', $paragraph, $match) === 1) {
                $spec = $match[1];
            } else {
                $rest[] = $paragraph;
            }
        }

        // A block that is one numbered list and nothing else shows as steps; a list in a text stays in its place.
        if (count($rest) === 1 && preg_match('/^\d+\. /', $rest[0]) === 1) {
            foreach (explode("\n", $rest[0]) as $item) {
                $steps[] = trim(Str::inlineMarkdown((string) preg_replace('/^\d+\.\s+/', '', $item), self::MARKDOWN_OPTIONS));
            }

            $rest = [];
        }

        return new ContentBlockData(
            title: trim($lines[0]),
            html: $this->markdown(implode("\n\n", $rest)),
            spec: $spec,
            steps: $steps,
        );
    }

    public function read(string $relativePath): string
    {
        $contents = @file_get_contents(resource_path('content/' . $relativePath));

        if ($contents === false) {
            throw new RuntimeException('Content file not found: ' . $relativePath);
        }

        return $contents;
    }

    /**
     * @return array{0: array<string, string>, 1: string}
     */
    private function splitFrontMatter(string $document): array
    {
        if (preg_match('/\A---\R(.*?)\R---\R?(.*)\z/s', $document, $match) !== 1) {
            return [[], $document];
        }

        $frontMatter = [];

        foreach (explode("\n", $match[1]) as $line) {
            if (preg_match('/^(\w+):\s*(.*)$/', rtrim($line), $pair) === 1) {
                $frontMatter[$pair[1]] = trim($pair[2], " \t\"'");
            }
        }

        return [$frontMatter, $match[2]];
    }

    private function markdown(string $markdown): string
    {
        return trim(Str::markdown(trim($markdown), self::MARKDOWN_OPTIONS));
    }
}
