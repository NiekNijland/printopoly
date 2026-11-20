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
    /** @var array<string, mixed> */
    private const array MARKDOWN_OPTIONS = [
        'html_input' => 'strip',
        'allow_unsafe_links' => false,
    ];

    public function page(string $name, Locale $locale): ContentPageData
    {
        $document = $this->read($locale->value . '/' . $name . '.md');
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
            $blocks = preg_split('/^### /m', $lines[1] ?? '');
            $blocks = $blocks === false ? [$lines[1] ?? ''] : $blocks;
            $text = array_shift($blocks) ?? '';
            $sections[] = new ContentSectionData(
                id: Str::slug($title),
                title: $title,
                html: $this->markdown($text),
                blocks: array_map($this->block(...), $blocks),
            );
        }

        return new ContentPageData(
            title: $heading !== '' ? $heading : ($frontMatter['title'] ?? ''),
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
            } elseif (preg_match('/^\d+\. /', $paragraph) === 1) {
                foreach (explode("\n", $paragraph) as $item) {
                    $steps[] = trim(Str::inlineMarkdown((string) preg_replace('/^\d+\.\s+/', '', $item), self::MARKDOWN_OPTIONS));
                }
            } else {
                $rest[] = $paragraph;
            }
        }

        return new ContentBlockData(
            title: trim($lines[0]),
            html: $this->markdown(implode("\n\n", $rest)),
            spec: $spec,
            steps: $steps,
        );
    }

    private function read(string $relativePath): string
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
