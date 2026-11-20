<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Print\ChromeFlags;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * The host resolver rule that lets Chrome reach the loopback listener while the Host header stays the
 * public name must end up in the laravel-pdf Chrome driver config.
 */
final class ChromeFlagsConfigTest extends TestCase
{
    #[Test]
    public function the_host_resolver_rules_become_a_chrome_flag(): void
    {
        $this->assertSame(
            ['--host-resolver-rules=MAP printopoly.nl 127.0.0.1'],
            ChromeFlags::forHostResolverRules('MAP printopoly.nl 127.0.0.1'),
        );
    }

    #[Test]
    public function no_flag_is_passed_when_the_rule_is_empty_or_missing(): void
    {
        $this->assertSame([], ChromeFlags::forHostResolverRules(''));
        $this->assertSame([], ChromeFlags::forHostResolverRules('  '));
        $this->assertSame([], ChromeFlags::forHostResolverRules(null));
    }

    #[Test]
    public function the_pdf_config_takes_its_flags_from_the_helper(): void
    {
        $config = require config_path('laravel-pdf.php');
        $this->assertIsArray($config);
        $chrome = $config['chrome'];
        $this->assertIsArray($chrome);

        $this->assertSame(config('laravel-pdf.chrome.custom_flags'), $chrome['custom_flags']);
    }
}
