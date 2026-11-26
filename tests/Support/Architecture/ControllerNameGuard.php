<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

final readonly class ControllerNameGuard
{
    /**
     * @param string $folder the controller root, relative to the root
     * @param string $guide the guide with the table of verbs (Werkwoord, Betekenis), relative to the root
     */
    public function __construct(
        private PhpFileInspector $inspector,
        private string $root,
        private string $folder,
        private string $guide,
    ) {
    }

    /**
     * @return list<string>
     */
    public function verbs(): array
    {
        $verbs = [];

        foreach (GuideText::table(GuideText::of($this->root, $this->guide), ['Werkwoord', 'Betekenis']) as [$verb]) {
            $verbs = [...$verbs, ...GuideText::codeSpans($verb)];
        }

        return $verbs;
    }

    /**
     * @return list<string> "suffix <path>", "verb <path>" per controller and "stale <Verb>" per verb no controller carries, sorted
     */
    public function findings(): array
    {
        $verbs = $this->verbs();

        if ($verbs === []) {
            return ['guide ' . $this->guide];
        }

        $findings = [];
        $used = [];

        foreach (SourceClasses::in($this->inspector, $this->root, $this->folder) as ['path' => $path, 'class' => $class]) {
            if (! SourceClasses::isConcrete($class)) {
                continue;
            }

            $name = SourceClasses::shortName($class);

            if (! str_ends_with($name, 'Controller')) {
                $findings[] = 'suffix ' . $path;

                continue;
            }

            $verb = $this->verbOf($path, mb_substr($name, 0, -mb_strlen('Controller')), $verbs);

            if ($verb === null) {
                $findings[] = 'verb ' . $path;
            } else {
                $used[$verb] = true;
            }
        }

        foreach (array_diff($verbs, array_keys($used)) as $verb) {
            $findings[] = 'stale ' . $verb;
        }

        sort($findings, SORT_STRING);

        return $findings;
    }

    /**
     * @param list<string> $findings
     * @return list<string>
     */
    public function explain(array $findings): array
    {
        return array_map(function (string $finding): string {
            [$rule, $subject] = array_pad(explode(' ', $finding, 2), 2, '');

            return match ($rule) {
                'guide' => $this->guide . ' holds no table of verbs (Werkwoord, Betekenis): the guard reads the verbs from it.',
                'suffix' => $subject . ': a controller is named `<Verb>Controller`.',
                'stale' => 'the verb ' . $subject . ' is in the table of ' . $this->guide . ' and no controller carries it: remove the row. A verb joins the table with the first controller that needs it.',
                default => $subject . ': the controller is not named after a verb of the table in ' . $this->guide . ' (`<Area>/<Noun>/<Verb>Controller`): rename it to one, or add the verb with its meaning to the table.',
            };
        }, $findings);
    }

    /**
     * @param list<string> $verbs
     */
    private function verbOf(string $path, string $stem, array $verbs): ?string
    {
        $depth = count(explode('/', mb_substr(dirname($path), mb_strlen($this->folder)))) - 1;

        if ($depth === 2) {
            return in_array($stem, $verbs, true) ? $stem : null;
        }

        $leading = array_filter($verbs, static fn (string $verb): bool => preg_match('/^' . preg_quote($verb, '/') . '(?:[A-Z]|$)/', $stem) === 1);
        usort($leading, static fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));

        return $leading[0] ?? null;
    }
}
