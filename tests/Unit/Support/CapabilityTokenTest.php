<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\CapabilityToken;
use PHPUnit\Framework\TestCase;

final class CapabilityTokenTest extends TestCase
{
    public function test_a_new_token_has_the_one_length_and_matches_the_pattern_the_requests_check(): void
    {
        $token = CapabilityToken::make();

        self::assertSame(40, CapabilityToken::LENGTH);
        self::assertSame(CapabilityToken::LENGTH, mb_strlen($token));
        self::assertSame(1, preg_match(CapabilityToken::pattern(), $token));
        self::assertNotSame($token, CapabilityToken::make());
    }

    public function test_the_pattern_refuses_a_token_of_another_length_or_with_other_characters(): void
    {
        self::assertSame(0, preg_match(CapabilityToken::pattern(), str_repeat('a', 39)));
        self::assertSame(0, preg_match(CapabilityToken::pattern(), str_repeat('a', 41)));
        self::assertSame(0, preg_match(CapabilityToken::pattern(), str_repeat('a', 39) . '-'));
        self::assertSame(1, preg_match(CapabilityToken::pattern(), str_repeat('aZ9', 13) . 'x'));
    }
}
