<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * Translations (catalog/tests-database-ci-docs.md, "Translations and copy"): every key is in every language with the same
 * placeholders and plural forms, every key the code names literally exists, and no key is unused. A key counts as used when a
 * source names it as a whole string (`t('a.b')`, `__('a.b')`, a label map `{ x: 'a.b' }`), or when a translate call builds it
 * from a template whose fixed start (`a.${x}`) or fixed end (`t(`${label}_tagline`)` with `'a.blank'` written elsewhere)
 * matches it. The keys no source uses today are the counted list: a key that joins them fails, and so does a listed key that a
 * source uses again or the catalogs no longer hold.
 */
final readonly class TranslationKeysGuard
{
    private const string CALL = '(?<![A-Za-z0-9_$.>:])(?:t|tChoice|__|trans|trans_choice|@lang|Lang::get|Lang::choice)\(\s*';

    /**
     * @param array<string, array<string, string>> $catalogs the language code mapped to its catalog (key to text)
     * @param array<string, string> $sources the path of each source file mapped to its text (tests left out)
     * @param list<string> $unusedList the counted list: the keys no source uses today
     */
    public function __construct(
        private array $catalogs,
        private array $sources,
        private array $unusedList,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        return [...$this->languageViolations(), ...$this->undefinedKeys(), ...$this->unusedViolations()];
    }

    /**
     * @return list<string>
     */
    public function unusedKeys(): array
    {
        $haystack = implode("\n", $this->sources);
        [$prefixes, $suffixes] = $this->templates();
        $unused = [];

        foreach ($this->allKeys() as $key) {
            if ($this->quoted($haystack, $key)) {
                continue;
            }

            foreach ($prefixes as $prefix) {
                if (str_starts_with($key, $prefix)) {
                    continue 2;
                }
            }

            foreach ($suffixes as $suffix) {
                if (str_ends_with($key, $suffix) && $this->quoted($haystack, substr($key, 0, -strlen($suffix)))) {
                    continue 2;
                }
            }

            $unused[] = $key;
        }

        sort($unused);

        return $unused;
    }

    /**
     * @return list<string>
     */
    private function languageViolations(): array
    {
        $violations = [];
        $keys = $this->allKeys();

        foreach ($this->catalogs as $language => $catalog) {
            foreach ($keys as $key) {
                if (! array_key_exists($key, $catalog)) {
                    $violations[] = 'the key ' . $key . ' is missing in lang/' . $language . '.json: add its text, every key is in every language';

                    continue;
                }

                foreach ($this->catalogs as $other => $otherCatalog) {
                    if ($other === $language || ! array_key_exists($key, $otherCatalog) || strcmp($language, $other) > 0) {
                        continue;
                    }

                    if ($this->placeholders($catalog[$key]) !== $this->placeholders($otherCatalog[$key])) {
                        $violations[] = 'the key ' . $key . ' has other placeholders in lang/' . $language . '.json than in lang/' . $other . '.json: name the same :placeholders in every language';
                    }

                    if (substr_count($catalog[$key], '|') !== substr_count($otherCatalog[$key], '|')) {
                        $violations[] = 'the key ' . $key . ' has another number of plural forms in lang/' . $language . '.json than in lang/' . $other . '.json: give every language the same forms, split by |';
                    }
                }
            }
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    private function undefinedKeys(): array
    {
        $known = array_flip($this->allKeys());
        $violations = [];

        foreach ($this->sources as $path => $text) {
            preg_match_all('/' . self::CALL . '([\'"])((?:(?!\1)[^$\n])+)\1/', $text, $matches);

            foreach (array_unique($matches[2]) as $key) {
                if (! isset($known[$key])) {
                    $violations[] = $path . ' translates the key ' . $key . ', which no catalog in lang/ holds: add it to every language, or name a key that exists';
                }
            }
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    private function unusedViolations(): array
    {
        $unused = $this->unusedKeys();
        $listed = array_values(array_unique($this->unusedList));
        $violations = [];

        foreach (array_diff($unused, $listed) as $key) {
            $violations[] = 'the key ' . $key . ' is used by no source: delete it from every catalog in lang/, or use it (a key is never added to the counted list)';
        }

        foreach (array_diff($listed, $unused) as $key) {
            $violations[] = 'the key ' . $key . ' is on the counted list of unused keys, but a source uses it or no catalog holds it: drop its line from the list';
        }

        return $violations;
    }

    /**
     * @return list<string>
     */
    private function allKeys(): array
    {
        $keys = [];

        foreach ($this->catalogs as $catalog) {
            foreach (array_keys($catalog) as $key) {
                $keys[$key] = true;
            }
        }

        $keys = array_map(strval(...), array_keys($keys));
        sort($keys);

        return $keys;
    }

    /**
     * @return list<string>
     */
    private function placeholders(string $text): array
    {
        preg_match_all('/:([A-Za-z_]+)/', $text, $matches);
        $names = array_values(array_unique($matches[1]));
        sort($names);

        return $names;
    }

    private function quoted(string $haystack, string $text): bool
    {
        return str_contains($haystack, "'" . $text . "'") || str_contains($haystack, '"' . $text . '"') || str_contains($haystack, '`' . $text . '`');
    }

    /**
     * The fixed start (with a dot, so it names a key group) and the fixed end of each template a key can be built from.
     *
     * @return array{list<string>, list<string>}
     */
    private function templates(): array
    {
        $prefixes = [];
        $suffixes = [];

        foreach ($this->sources as $text) {
            preg_match_all('/`([^`$]*)\$\{[^`]*\}([^`$]*)`/', $text, $matches);

            foreach ($matches[1] as $index => $prefix) {
                if (str_contains($prefix, '.')) {
                    $prefixes[] = $prefix;
                } elseif ($matches[2][$index] !== '') {
                    $suffixes[] = $matches[2][$index];
                }
            }

            preg_match_all('/' . self::CALL . '"([^"${]*)\{?\$/', $text, $phpMatches);

            foreach ($phpMatches[1] as $prefix) {
                if ($prefix !== '') {
                    $prefixes[] = $prefix;
                }
            }
        }

        return [array_values(array_unique($prefixes)), array_values(array_unique($suffixes))];
    }
}
