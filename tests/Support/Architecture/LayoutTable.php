<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * @phpstan-type NameRule array{suffixes: list<string>, forbidden: string|null, exact: string|null}
 */
final readonly class LayoutTable
{
    public const string WORD = '[A-Z][A-Za-z0-9]*';

    /**
     * @param list<string> $modules
     * @param list<string> $adapters
     * @param array<string, NameRule> $layers by the path of the layer, `<Area>` for a folder of any name
     * @param array<string, NameRule> $folders
     */
    private function __construct(
        public ?string $moduleRoot,
        public array $modules,
        public ?string $adapterRoot,
        public array $adapters,
        public array $layers,
        public array $folders,
    ) {
    }

    public static function read(string $text): self
    {
        $moduleRoot = null;
        $adapterRoot = null;
        $modules = [];
        $adapters = [];

        foreach (GuideText::table($text, ['Wortel', 'Bevat', 'Leden']) as [$place, , $members]) {
            if (preg_match('#^`([A-Za-z]+(?:/[A-Za-z]+)*)/<(Domain|System)>`$#', $place, $match) !== 1) {
                continue;
            }

            if ($match[2] === 'Domain') {
                $moduleRoot = $match[1];
                $modules = GuideText::codeSpans($members);
            } else {
                $adapterRoot = $match[1];
                $adapters = GuideText::codeSpans($members);
            }
        }

        $layers = [];

        foreach (GuideText::table($text, ['Laag', 'Bevat', 'Naam']) as [$place, , $name]) {
            if (preg_match('#^`([A-Za-z]+(?:/(?:[A-Za-z]+|<[A-Za-z]+>))*)`$#', $place, $match) === 1) {
                $layers[$match[1]] = self::nameRule($name, null);
            }
        }

        $folders = [];

        foreach (GuideText::table($text, ['Map', 'Bevat', 'Naam']) as [$names, , $name]) {
            $listed = GuideText::codeSpans($names);

            foreach ($listed as $folder) {
                $folders[$folder] = self::nameRule($name, count($listed) === 1 ? null : $folder);
            }
        }

        return new self($moduleRoot, $modules, $adapterRoot, $adapters, $layers, $folders);
    }

    public static function pattern(string $layer): string
    {
        $segments = array_map(static fn (string $segment): string => str_starts_with($segment, '<') ? self::WORD : preg_quote($segment, '#'), explode('/', $layer));

        return '#^' . implode('/', $segments) . '/(' . self::WORD . ')\.php$#';
    }

    /**
     * @param NameRule $rule
     */
    public static function nameFits(array $rule, string $class): bool
    {
        if ($rule['exact'] !== null) {
            return $class === $rule['exact'];
        }

        if ($rule['forbidden'] !== null && str_ends_with($class, $rule['forbidden'])) {
            return false;
        }

        return $rule['suffixes'] === [] || array_any($rule['suffixes'], static fn (string $suffix): bool => str_ends_with($class, $suffix));
    }

    /**
     * @return NameRule
     */
    private static function nameRule(string $cell, ?string $ownFolder): array
    {
        preg_match_all('/`<[A-Za-z]+>([A-Za-z]+)`/', $cell, $suffixes);
        $own = $ownFolder === null
            ? $suffixes[1]
            : array_values(array_filter($suffixes[1], static fn (string $suffix): bool => $suffix === $ownFolder || $suffix . 's' === $ownFolder));

        return [
            'suffixes' => $own,
            'forbidden' => preg_match('/nooit een `([A-Za-z]+)`-achtervoegsel/', $cell, $never) === 1 ? $never[1] : null,
            'exact' => preg_match('/precies `([A-Za-z]+)`/', $cell, $exact) === 1 ? $exact[1] : null,
        ];
    }
}
