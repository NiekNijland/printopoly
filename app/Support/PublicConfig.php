<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Config;

/**
 * The settings the browser reads at runtime, from a JSON script tag in the page. The release is built in
 * a clean container without the production .env, so `import.meta.env.VITE_*` is empty in the shipped
 * bundle. Only public values go in here: the Reverb app key is public by design (it is in every page that
 * connects), the app secret is never read.
 */
final class PublicConfig
{
    /**
     * @return array{reverb: array{key: ?string, host: ?string, port: ?int, scheme: ?string}, bugsnag: array{apiKey: ?string, releaseStage: ?string}}
     */
    public static function toArray(): array
    {
        $reverb = Config::array('printopoly.public.reverb');
        $bugsnag = Config::array('printopoly.public.bugsnag');
        $port = $reverb['port'] ?? null;

        return [
            'reverb' => [
                'key' => JsonShape::filledString($reverb['key'] ?? null),
                'host' => JsonShape::filledString($reverb['host'] ?? null),
                'port' => is_numeric($port) ? (int) $port : null,
                'scheme' => JsonShape::filledString($reverb['scheme'] ?? null),
            ],
            'bugsnag' => [
                'apiKey' => JsonShape::filledString($bugsnag['apiKey'] ?? null),
                'releaseStage' => JsonShape::filledString($bugsnag['releaseStage'] ?? null),
            ],
        ];
    }

    public static function toJson(): string
    {
        return json_encode(self::toArray(), JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    }
}
