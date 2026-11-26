<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use PhpParser\Node;
use PhpParser\Node\Expr\Exit_;
use PhpParser\Node\Expr\FuncCall;
use PhpParser\Node\Name;

final class PresetScan
{
    /**
     * @param list<string> $folders the folders to read, relative to the root
     * @param list<string> $functions the banned functions, lower case
     * @param list<string> $prefixes the banned function families, by their prefix
     * @param array<class-string<Node>, string> $constructs the banned language constructs, with the keyword they are written with
     * @return list<string> `<path>::<member> <preset> <name>` per use, sorted
     */
    public static function findings(PhpFileInspector $inspector, string $root, array $folders, string $preset, array $functions, array $prefixes, array $constructs): array
    {
        $found = [];

        foreach ($folders as $folder) {
            foreach ($inspector->phpFiles($root . '/' . $folder) as $file) {
                $relative = mb_substr($file, mb_strlen($root) + 1);

                foreach (MemberNodes::of($inspector->statements($file), Node::class) as $site) {
                    $name = self::bannedName($site['node'], $functions, $prefixes, $constructs);

                    if ($name !== null) {
                        $found[] = $relative . '::' . $site['member'] . ' ' . $preset . ' ' . $name;
                    }
                }
            }
        }

        sort($found, SORT_STRING);

        return $found;
    }

    /**
     * @param list<string> $functions
     * @param list<string> $prefixes
     * @param array<class-string<Node>, string> $constructs
     */
    private static function bannedName(Node $node, array $functions, array $prefixes, array $constructs): ?string
    {
        if ($node instanceof FuncCall && $node->name instanceof Name) {
            $function = mb_strtolower($node->name->getLast());

            return in_array($function, $functions, true) || array_any($prefixes, static fn (string $prefix): bool => str_starts_with($function, $prefix)) ? $function . '()' : null;
        }

        foreach ($constructs as $type => $keyword) {
            if ($node instanceof $type && ($keyword !== 'die' || $node->getAttribute('kind') === Exit_::KIND_DIE)) {
                return $keyword;
            }
        }

        return null;
    }
}
