<?php

declare(strict_types=1);

namespace App\Integrations\Chrome;

/**
 * Extra Chrome flags for the PDF renderer. In production the render origin is only reachable on
 * nginx's loopback listener, so a host resolver rule (for example "MAP printopoly.nl 127.0.0.1")
 * becomes --host-resolver-rules while the Host header stays the public name.
 */
final class ChromeFlags
{
    /**
     * @return list<string>
     */
    public static function forHostResolverRules(?string $rules): array
    {
        if ($rules === null || trim($rules) === '') {
            return [];
        }

        return ['--host-resolver-rules=' . trim($rules)];
    }
}
