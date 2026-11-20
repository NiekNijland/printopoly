<?php

declare(strict_types=1);

namespace App\Support;

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
        $port = config('printopoly.public.reverb.port');

        return [
            'reverb' => [
                'key' => self::text('printopoly.public.reverb.key'),
                'host' => self::text('printopoly.public.reverb.host'),
                'port' => is_numeric($port) ? (int) $port : null,
                'scheme' => self::text('printopoly.public.reverb.scheme'),
            ],
            'bugsnag' => [
                'apiKey' => self::text('printopoly.public.bugsnag.apiKey'),
                'releaseStage' => self::text('printopoly.public.bugsnag.releaseStage'),
            ],
        ];
    }

    public static function toJson(): string
    {
        return json_encode(self::toArray(), JSON_THROW_ON_ERROR | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    }

    private static function text(string $key): ?string
    {
        $value = config($key);

        return is_string($value) && $value !== '' ? $value : null;
    }
}
