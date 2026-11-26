<?php

declare(strict_types=1);

namespace Tests\Feature;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Sleep;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

final class HermeticBaseTest extends TestCase
{
    public function test_no_request_leaves_the_test(): void
    {
        self::assertTrue(Http::preventingStrayRequests());

        $this->expectException(RuntimeException::class);
        Http::get('https://example.com');
    }

    public function test_no_process_starts(): void
    {
        self::assertTrue(Process::preventingStrayProcesses());

        $this->expectException(RuntimeException::class);
        Process::run(['true']);
    }

    public function test_the_clock_stands_still_at_a_test_moment(): void
    {
        $before = now();
        Sleep::for(1)->second();

        self::assertTrue(CarbonImmutable::hasTestNow());
        self::assertSame($before->toIso8601String(), now()->toIso8601String());
    }

    public function test_a_sleep_is_recorded_instead_of_waited(): void
    {
        Sleep::for(1)->second();

        Sleep::assertSequence([Sleep::for(1)->second()]);
    }

    public function test_two_generated_ids_differ(): void
    {
        self::assertNotSame((string) Str::uuid(), (string) Str::uuid());
        self::assertNotSame(Str::random(), Str::random());
    }
}
