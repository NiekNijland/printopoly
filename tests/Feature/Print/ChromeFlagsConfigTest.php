<?php

declare(strict_types=1);

namespace Tests\Feature\Print;

use App\Print\ChromeFlags;
use Tests\TestCase;

/**
 * The host resolver rule that lets Chrome reach the loopback listener while the Host header stays the
 * public name must end up in the laravel-pdf Chrome driver config.
 */
final class ChromeFlagsConfigTest extends TestCase
{
    public function test_the_host_resolver_rules_become_a_chrome_flag(): void
    {
        self::assertSame(
            ['--host-resolver-rules=MAP printopoly.nl 127.0.0.1'],
            ChromeFlags::forHostResolverRules('MAP printopoly.nl 127.0.0.1'),
        );
    }

    public function test_no_flag_is_passed_when_the_rule_is_empty_or_missing(): void
    {
        self::assertSame([], ChromeFlags::forHostResolverRules(''));
        self::assertSame([], ChromeFlags::forHostResolverRules('  '));
        self::assertSame([], ChromeFlags::forHostResolverRules(null));
    }

    public function test_the_pdf_config_takes_its_flags_from_the_helper(): void
    {
        $config = require config_path('laravel-pdf.php');
        self::assertIsArray($config);
        $chrome = $config['chrome'];
        self::assertIsArray($chrome);

        self::assertSame(config('laravel-pdf.chrome.custom_flags'), $chrome['custom_flags']);
    }
}
