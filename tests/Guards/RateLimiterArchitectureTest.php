<?php

declare(strict_types=1);

namespace Tests\Guards;

use App\Providers\AppServiceProvider;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\RateLimiterGuard;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class RateLimiterArchitectureTest extends TestCase
{
    private const string PROVIDER = "<?php\nnamespace App\\Providers;\nuse Illuminate\\Cache\\RateLimiting\\Limit;\nuse Illuminate\\Support\\Facades\\Config;\nuse Illuminate\\Support\\Facades\\RateLimiter;\nfinal class AppServiceProvider\n{\n    public function boot(): void\n    {\n";

    private const string OTHER = "<?php\nnamespace App\\Http;\nuse Illuminate\\Cache\\RateLimiting\\Limit;\nuse Illuminate\\Support\\Facades\\RateLimiter;\nfinal class Kernel\n{\n    public function boot(\\Illuminate\\Cache\\RateLimiter \$limiter): void\n    {\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function limitsOfAnotherForm(): iterable
    {
        yield 'a number in a limit' => [self::PROVIDER . "        RateLimiter::for('editions', fn (\$r) => Limit::perMinute(300)->by('a'));\n    }\n}\n", 'a limit with a number or a constant in the code'];
        yield 'a constant in a limit' => [self::PROVIDER . "        RateLimiter::for('editions', fn (\$r) => Limit::perHour(self::MAX)->by('a'));\n    }\n}\n", 'a limit with a number or a constant in the code'];
        yield 'a number in a built limit' => [self::PROVIDER . "        RateLimiter::for('editions', fn (\$r) => new Limit('a', 60, 1));\n    }\n}\n", 'a limit with a number or a constant in the code'];
        yield 'a limiter outside the provider' => [self::OTHER . "        RateLimiter::for('editions', fn (\$r) => Limit::none());\n    }\n}\n", 'a limiter defined outside App\\Providers\\AppServiceProvider'];
        yield 'an injected limiter outside the provider' => [self::OTHER . "        \$limiter->for('editions', fn (\$r) => Limit::none());\n    }\n}\n", 'a limiter defined outside App\\Providers\\AppServiceProvider'];
        yield 'a throttle by numbers' => ["<?php\nuse Illuminate\\Support\\Facades\\Route;\nRoute::post('a', \\App\\A::class)->middleware('throttle:60,1');\n", 'a throttle with numbers in the route ("throttle:60,1")'];
        yield 'a throttle by numbers in a list' => ["<?php\nuse Illuminate\\Support\\Facades\\Route;\nRoute::middleware(['guest', 'throttle:20,1'])->group(fn () => null);\n", 'a throttle with numbers in the route ("throttle:20,1")'];
    }

    #[Test]
    #[DataProvider('limitsOfAnotherForm')]
    public function it_detects_a_limit_of_another_form(string $source, string $reason): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'a limit read from config in the provider' => [self::PROVIDER . "        RateLimiter::for('editions', fn (\$r) => Limit::perMinute(Config::integer('printopoly.limits.editions'))->by('a'));\n    }\n}\n"];
        yield 'a throttle by name' => ["<?php\nuse Illuminate\\Support\\Facades\\Route;\nRoute::post('a', \\App\\A::class)->middleware('throttle:editions');\n"];
        yield 'a for() of another object' => [self::OTHER . "        \$this->loop->for('a', 3);\n    }\n}\n"];
    }

    #[Test]
    #[DataProvider('nearMisses')]
    public function it_accepts_a_named_limiter_read_from_config_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

    #[Test]
    public function it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            'app/Providers/AppServiceProvider.php' => self::PROVIDER . "        RateLimiter::for('a', fn (\$r) => Limit::perMinute(1));\n    }\n}\n",
            'bootstrap/app.php' => "<?php\n",
            'routes/web.php' => "<?php\n",
        ], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Providers/AppServiceProvider.php:10: a limit with a number', $violations[0]);
    }

    #[Test]
    public function it_holds_the_real_tree_to_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/rate-limits.txt')->differences($this->guard($root)->violations()));
    }

    private function guard(string $root): RateLimiterGuard
    {
        return new RateLimiterGuard(new PhpFileInspector(), $root, ['app', 'bootstrap', 'routes'], AppServiceProvider::class, 'config/printopoly.php');
    }
}
