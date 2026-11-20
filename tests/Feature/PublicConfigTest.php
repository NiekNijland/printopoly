<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Print\PrintRelease;
use App\Support\PublicConfig;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class PublicConfigTest extends TestCase
{
    #[Test]
    public function the_page_carries_the_public_reverb_settings_and_never_the_secret(): void
    {
        config([
            'printopoly.public.reverb' => ['key' => 'public-key-123', 'host' => 'printopoly.nl', 'port' => '443', 'scheme' => 'https'],
            'reverb.apps.apps.0.secret' => 'super-secret-value',
            'broadcasting.connections.reverb.secret' => 'super-secret-value',
        ]);

        $html = $this->get('/nl')->assertOk()->getContent();

        self::assertIsString($html);
        self::assertStringContainsString('id="printopoly-config"', $html);
        self::assertStringContainsString('public-key-123', $html);
        self::assertStringContainsString('printopoly.nl', $html);
        self::assertStringNotContainsString('super-secret-value', $html);

        $json = PublicConfig::toArray();
        self::assertSame(['key' => 'public-key-123', 'host' => 'printopoly.nl', 'port' => 443, 'scheme' => 'https'], $json['reverb']);
        self::assertStringNotContainsString('secret', strtolower(PublicConfig::toJson()));
    }

    #[Test]
    public function unset_values_are_null_and_markup_cannot_break_out_of_the_tag(): void
    {
        config(['printopoly.public.reverb.key' => '', 'printopoly.public.bugsnag.apiKey' => '</script><b>']);

        self::assertNull(PublicConfig::toArray()['reverb']['key']);
        self::assertStringNotContainsString('</script>', PublicConfig::toJson());
    }

    #[Test]
    public function the_print_release_follows_the_build_when_the_env_is_empty(): void
    {
        $manifest = public_path('build/manifest.json');
        if (! is_file($manifest)) {
            self::markTestSkipped('No build here.');
        }

        Cache::flush();
        config(['printopoly.print.release' => 'pinned']);
        self::assertSame('pinned', PrintRelease::current());

        config(['printopoly.print.release' => null]);
        $derived = PrintRelease::current();
        self::assertSame(substr((string) hash_file('sha256', $manifest), 0, 16), $derived);
        self::assertSame($derived, PrintRelease::current());
    }
}
