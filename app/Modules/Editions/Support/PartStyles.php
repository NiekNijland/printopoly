<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

/**
 * The styles a part of the set can have on top of its theme (B268): one element per part, `style.<part>` with the
 * field `style`. The ids come from resources/js/lib/edition/part-styles.json, the file the browser reads too, so a
 * new style is added in one place (see the comment in part-styles.ts).
 */
final class PartStyles
{
    public const string FILE = 'js/lib/edition/part-styles.json';

    /** The part name in the key (`style.box_lid`) per part in the JSON (`boxLid`). */
    private const array KEY_NAMES = [
        'board' => 'board',
        'cards' => 'cards',
        'deeds' => 'deeds',
        'money' => 'money',
        'pawns' => 'pawns',
        'box_lid' => 'boxLid',
    ];

    /**
     * The part of a style key (`boxLid` for `style.box_lid`), or null when the key is no style key.
     */
    public static function partOfKey(string $key): ?string
    {
        $parts = explode('.', $key);

        if (count($parts) !== 2 || $parts[0] !== 'style') {
            return null;
        }

        return self::KEY_NAMES[$parts[1]] ?? null;
    }

    /**
     * The styles a part offers.
     *
     * @return list<string>
     */
    public static function idsFor(string $part): array
    {
        return self::all()[$part] ?? [];
    }

    public static function isStyle(string $key, mixed $value): bool
    {
        $part = self::partOfKey($key);

        return $part !== null && is_string($value) && in_array($value, self::idsFor($part), true);
    }

    /**
     * @return array<string, list<string>>
     */
    public static function all(): array
    {
        /** @var array<string, list<string>>|null $styles */
        static $styles = null;

        if ($styles === null) {
            $decoded = json_decode((string) file_get_contents(resource_path(self::FILE)), true, 8, JSON_THROW_ON_ERROR);
            $styles = [];

            foreach (is_array($decoded) ? $decoded : [] as $part => $ids) {
                $styles[(string) $part] = array_values(array_filter(is_array($ids) ? $ids : [], is_string(...)));
            }
        }

        return $styles;
    }
}
