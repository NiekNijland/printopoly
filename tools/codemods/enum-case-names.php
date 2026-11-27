<?php

declare(strict_types=1);

// Renames the cases of the enums below to UPPER_CASE (EnumShapeGuard, rule "cases"); the values stay. The map is read
// from the enum files, so a second run on the renamed tree changes nothing. Run from the root:
// php tools/codemods/enum-case-names.php

const ENUMS = [
    'app/Modules/Analytics/Enums/FeatureEvent.php',
    'app/Modules/Content/Enums/Locale.php',
    'app/Modules/Content/Enums/PublicPage.php',
    'app/Modules/Editions/Enums/ElementKind.php',
    'app/Modules/Print/Enums/BoardForm.php',
    'app/Modules/Print/Enums/FailureReason.php',
    'app/Modules/Print/Enums/MoneyAmount.php',
    'app/Modules/Print/Enums/PartStatus.php',
    'app/Modules/Print/Enums/PrintPart.php',
    'app/Modules/Print/Enums/PrintSet.php',
];

const FOLDERS = ['app', 'bootstrap', 'config', 'database', 'routes', 'tests'];

function upper(string $name): string
{
    return mb_strtoupper((string) preg_replace('/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/', '_', $name));
}

function significant(array $tokens, int $i, int $step): int
{
    do {
        $i += $step;
    } while (isset($tokens[$i]) && is_array($tokens[$i]) && in_array($tokens[$i][0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true));

    return $i;
}

$maps = [];

foreach (ENUMS as $path) {
    $enum = basename($path, '.php');
    preg_match_all('/^\s*case\s+(\w+)\s*=/m', (string) file_get_contents($path), $cases);
    preg_match_all('/\bconst\s+(?:\w+\s+)?(\w+)\s*=/', (string) file_get_contents($path), $constants);
    foreach ($cases[1] as $case) {
        if ($case !== upper($case) && in_array(upper($case), $constants[1], true)) {
            fwrite(STDERR, "{$enum}::{$case} would become " . upper($case) . ", a constant of the enum: rename the constant first\n");

            exit(1);
        }
        $maps[$enum][$case] = upper($case);
    }
}

$changed = 0;

foreach (FOLDERS as $folder) {
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($folder, FilesystemIterator::SKIP_DOTS)) as $file) {
        if (! str_ends_with($file->getPathname(), '.php')) {
            continue;
        }

        $path = $file->getPathname();
        $own = in_array($path, ENUMS, true) ? basename($path, '.php') : null;
        $tokens = token_get_all((string) file_get_contents($path));
        $out = '';

        foreach ($tokens as $i => $token) {
            $text = is_array($token) ? $token[1] : $token;

            if (is_array($token) && $token[0] === T_STRING) {
                $before = significant($tokens, $i, -1);
                $class = null;

                if (($tokens[$before] ?? null) !== null && is_array($tokens[$before]) && $tokens[$before][0] === T_DOUBLE_COLON) {
                    $owner = $tokens[significant($tokens, $before, -1)] ?? null;
                    $name = is_array($owner) ? $owner[1] : '';
                    $last = substr((string) strrchr('\\' . $name, '\\'), 1);
                    $class = in_array(mb_strtolower($last), ['self', 'static'], true) ? $own : $last;
                }

                if ($own !== null && is_array($tokens[$before] ?? null) && $tokens[$before][0] === T_CASE) {
                    $class = $own;
                }

                if ($class !== null && isset($maps[$class][$text])) {
                    $text = $maps[$class][$text];
                }
            }

            $out .= $text;
        }

        if ($out !== file_get_contents($path)) {
            file_put_contents($path, $out);
            $changed++;
        }
    }
}

echo $changed . " files changed\n";
