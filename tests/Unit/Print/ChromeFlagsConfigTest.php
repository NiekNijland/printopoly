<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use Illuminate\Support\Env;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * The host resolver rule that lets Chrome reach the loopback listener while the Host header stays the
 * public name must end up in the laravel-pdf Chrome driver config.
 */
final class ChromeFlagsConfigTest extends TestCase
{
    #[Override]
    protected function tearDown(): void
    {
        Env::getRepository()->clear('PRINTOPOLY_CHROME_HOST_RESOLVER_RULES');

        parent::tearDown();
    }

    #[Test]
    public function the_host_resolver_rules_become_a_chrome_flag(): void
    {
        Env::getRepository()->set('PRINTOPOLY_CHROME_HOST_RESOLVER_RULES', 'MAP printopoly.nl 127.0.0.1');

        $this->assertSame(['--host-resolver-rules=MAP printopoly.nl 127.0.0.1'], $this->flags());
    }

    #[Test]
    public function no_flag_is_passed_when_the_rule_is_empty(): void
    {
        Env::getRepository()->set('PRINTOPOLY_CHROME_HOST_RESOLVER_RULES', '');

        $this->assertSame([], $this->flags());
    }

    /**
     * @return array<mixed>
     */
    private function flags(): array
    {
        $config = require config_path('laravel-pdf.php');
        $this->assertIsArray($config);
        $chrome = $config['chrome'];
        $this->assertIsArray($chrome);

        return $chrome['custom_flags'];
    }
}
