<?php

declare(strict_types=1);

namespace Tests\Unit\Integrations\Chrome;

use App\Integrations\Chrome\ChromeFlags;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ChromeFlagsTest extends TestCase
{
    public function test_a_rule_becomes_one_host_resolver_flag_without_the_spaces_around_it(): void
    {
        self::assertSame(
            ['--host-resolver-rules=MAP printopoly.nl 127.0.0.1'],
            ChromeFlags::forHostResolverRules("  MAP printopoly.nl 127.0.0.1\n"),
        );
    }

    /**
     * @return iterable<string, array{string|null}>
     */
    public static function noRules(): iterable
    {
        yield 'nothing set' => [null];
        yield 'an empty string' => [''];
        yield 'only spaces' => ['   '];
    }

    #[DataProvider('noRules')]
    public function test_without_a_usable_rule_chrome_gets_no_flag(?string $rules): void
    {
        self::assertSame([], ChromeFlags::forHostResolverRules($rules));
    }
}
