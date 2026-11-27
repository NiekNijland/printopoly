<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

/**
 * Reads the `scripts` of composer.json: each script as its list of commands (a script written as one string is a list of one).
 */
final class ComposerScripts
{
    public const string NO_TIMEOUT = 'Composer\Config::disableProcessTimeout';

    /**
     * @return array<string, list<string>>
     */
    public static function of(string $manifest): array
    {
        $scripts = [];

        foreach (YamlValue::map(json_decode($manifest, true, flags: JSON_THROW_ON_ERROR), 'scripts') as $name => $commands) {
            $scripts[(string) $name] = YamlValue::strings([$commands], 0);
        }

        return $scripts;
    }

    /**
     * How a command of a script reads when it is written out in a shell line: `@php x` is `x` run by php, `@name args` is
     * `composer name -- args` (or `composer name` without arguments), the timeout switch is no command.
     */
    public static function asShellLine(string $command): ?string
    {
        if ($command === self::NO_TIMEOUT) {
            return null;
        }

        if (str_starts_with($command, '@php ')) {
            return mb_substr($command, mb_strlen('@php '));
        }

        if (str_starts_with($command, '@composer ')) {
            return mb_substr($command, 1);
        }

        if (preg_match('/^@(\S+)(?:\s+(.*))?$/', $command, $match) === 1) {
            return 'composer ' . $match[1] . (isset($match[2]) && $match[2] !== '' ? ' -- ' . $match[2] : '');
        }

        return $command;
    }
}
