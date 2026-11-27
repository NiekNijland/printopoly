<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use RuntimeException;

final class ComposerNamespaces
{
    /**
     * @param string $manifestPath the path of the package manifest, passed in by the thin test
     * @return array<string, string> the namespaces the manifest autoloads outside the test folder (`autoload.psr-4`), with their folder
     */
    public static function autoloaded(string $manifestPath): array
    {
        $manifest = json_decode((string) file_get_contents($manifestPath), true);
        $map = is_array($manifest) && is_array($manifest['autoload'] ?? null) ? $manifest['autoload']['psr-4'] ?? null : null;

        throw_if(! is_array($map) || $map === [], RuntimeException::class, $manifestPath . ' has no autoload.psr-4 map: the user namespaces are read from it');

        $namespaces = [];

        foreach ($map as $namespace => $folder) {
            if (is_string($namespace) && is_string($folder)) {
                $namespaces[$namespace] = rtrim($folder, '/');
            }
        }

        return $namespaces;
    }
}
