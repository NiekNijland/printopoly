<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\BannedTestCallGuard;
use Tests\Support\Architecture\ComposerNamespaces;
use Tests\Support\Architecture\ListedFindings;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class BannedTestCallArchitectureTest extends TestCase
{
    private const string FEATURE = 'tests/Feature/FooTest.php';

    private const string UNIT = 'tests/Unit/FooTest.php';

    private const string BASE = 'tests/TestCase.php';

    private const string FACADES = '\\Illuminate\\Support\\Facades\\';

    /**
     * @return iterable<string, array{string, string, string}>
     */
    public static function bannedCalls(): iterable
    {
        yield 'config set through the facade' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Config;\nConfig::set('app.name', 'x');", 'config-set'];
        yield 'config set through the facade by its full name' => [self::FEATURE, self::FACADES . "Config::set(['app.name' => 'x']);", 'config-set'];
        yield 'config set through the global alias' => [self::FEATURE, "\\Config::set('app.name', 'x');", 'config-set'];
        yield 'config set through the helper' => [self::FEATURE, "config()->set('app.name', 'x');", 'config-set'];
        yield 'config set through the container string' => [self::FEATURE, "app('config')->set('app.name', 'x');", 'config-set'];
        yield 'config set through the container as an array' => [self::FEATURE, "\$this->app['config']->set('app.name', 'x');", 'config-set'];
        yield 'the clock pinned on the date facade' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Date;\nDate::setTestNow('2026-01-01');", 'clock-set'];
        yield 'the clock pinned on the immutable class by its full name' => [self::FEATURE, '\\Carbon\\' . 'CarbonImmutable::setTestNow();', 'clock-set'];
        yield 'the clock pinned under an alias with a time zone' => [self::FEATURE, "use Illuminate\\Support\\Carbon as Clock;\nClock::setTestNowAndTimezone('2026-01-01');", 'clock-set'];
        yield 'the clock pinned in a support class' => ['tests/Support/Foo.php', self::FACADES . 'Date::setTestNow();', 'clock-set'];
        yield 'the wall clock as a number' => [self::FEATURE, '$t = time();', 'wall-clock'];
        yield 'the wall clock in microseconds' => [self::FEATURE, '$t = \\microtime(true);', 'wall-clock'];
        yield 'the wall clock in nanoseconds' => [self::FEATURE, '$t = hrtime(true);', 'wall-clock'];
        yield 'the wall clock formatted' => [self::FEATURE, "\$t = date('Y');", 'wall-clock'];
        yield 'the wall clock as a timestamp' => [self::FEATURE, '$t = mktime();', 'wall-clock'];
        yield 'the wall clock as an immutable date' => [self::FEATURE, '$t = new \\DateTimeImmutable();', 'wall-clock'];
        yield 'the wall clock as a date of now' => [self::FEATURE, "\$t = new \\DateTimeImmutable('now');", 'wall-clock'];
        yield 'the wall clock as a mutable date' => [self::FEATURE, '$t = new \\Date' . 'Time;', 'wall-clock'];
        yield 'a binding on the application property' => [self::FEATURE, '$this->app->instance(Foo::class, $foo);', 'container-binding'];
        yield 'a closure binding on the application property' => [self::FEATURE, '$this->app->bind(Foo::class, fn () => $foo);', 'container-binding'];
        yield 'the instance helper of the test case' => [self::FEATURE, '$this->instance(Foo::class, $foo);', 'container-binding'];
        yield 'the instance of the facade' => [self::FEATURE, "use Illuminate\\Support\\Facades\\App;\nApp::instance(Foo::class, \$foo);", 'container-binding'];
        yield 'a ready object bound through the helper' => [self::FEATURE, 'app()->singleton(Foo::class, fn () => $foo);', 'container-binding'];
        yield 'a ready object bound through the facade by its full name' => [self::FEATURE, self::FACADES . 'App::bind(Foo::class, fn () => $foo);', 'container-binding'];
        yield 'a wait in seconds' => [self::FEATURE, 'sleep(1);', 'wait'];
        yield 'a wait in microseconds by its full name' => [self::FEATURE, '\\usleep(10);', 'wait'];
        yield 'a wait in nanoseconds' => [self::FEATURE, 'time_nanosleep(0, 1);', 'wait'];
        yield 'stray requests allowed on the facade' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Http;\nHttp::allowStrayRequests();", 'stray-switch'];
        yield 'stray processes allowed on the factory' => [self::FEATURE, '$factory->allowStrayProcesses();', 'stray-switch'];
        yield 'stray processes prevented in a test' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Process;\nProcess::preventStrayProcesses();", 'stray-switch'];
        yield 'stray requests prevented on a pending request' => [self::FEATURE, '$pending->preventStrayRequests();', 'stray-switch'];
        yield 'a socket by curl' => [self::FEATURE, "curl_init('x');", 'network'];
        yield 'a raw socket' => [self::FEATURE, "fsockopen('example.test', 80);", 'network'];
        yield 'a file read from a URL' => [self::FEATURE, "file_get_contents('https://example.test/a.json');", 'network'];
        yield 'a client of its own' => [self::FEATURE, "use GuzzleHttp\\Client;\n\$client = new Client();", 'network'];
        yield 'every event faked' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Event;\nEvent::fa" . 'ke();', 'fake-all'];
        yield 'every event faked with an empty list' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Event;\nEvent::fa" . 'ke([]);', 'fake-all'];
        yield 'every event faked by the full name' => [self::FEATURE, self::FACADES . 'Event::fa' . 'ke();', 'fake-all'];
        yield 'every event faked but some' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Event;\nEvent::fakeExcept([Foo::class]);", 'fake-all'];
        yield 'every event faked for a callback' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Event;\nEvent::fakeFor(fn () => 1);", 'fake-all'];
        yield 'every job faked' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Queue;\nQueue::fa" . 'ke();', 'fake-all'];
        yield 'every command faked with an empty list' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Bus;\nBus::fa" . 'ke([]);', 'fake-all'];
        yield 'the exception handler switched off' => [self::FEATURE, '$this->actingAs($user)->withoutExceptionHandling();', 'real-path'];
        yield 'the middleware switched off in a request chain' => [self::FEATURE, "\$this->actingAs(\$user)->withoutMiddleware(Foo::class)->get('/x');", 'real-path'];
        yield 'the middleware switched off on the test case' => [self::FEATURE, '$this->withoutMiddleware();', 'real-path'];
        yield 'the middleware switched off as a function' => [self::FEATURE, 'withoutMiddleware();', 'real-path'];
        yield 'a status code with a named assertion' => [self::FEATURE, '$response->assertStatus(409);', 'named-status'];
        yield 'a status code of the first assertion in a chain' => [self::FEATURE, "\$this->get('/x')->assertStatus(200);", 'named-status'];
        yield 'a double of a class of the project on the library' => [self::FEATURE, "use Mockery as Doubles;\nDoubles::mo" . 'ck(\\App\\Print\\Foo::class);', 'project-double'];
        yield 'a double of a class of the project on the test case' => [self::FEATURE, '$this->create' . 'Mock(\\App\\Print\\Foo::class);', 'project-double'];
        yield 'a static stub of a class of the project' => [self::FEATURE, "use App\\Print\\Foo;\nself::create" . 'Stub(Foo::class);', 'project-double'];
        yield 'a framework double of a class of the project' => [self::FEATURE, '$this->partial' . 'Mock(\\App\\Print\\Foo::class);', 'project-double'];
        yield 'a mock builder of a class of the project' => [self::FEATURE, '$this->getMock' . 'Builder(\\App\\Print\\Foo::class);', 'project-double'];
    }

    #[DataProvider('bannedCalls')]
    public function test_finds_every_spelling_of_a_banned_test_call(string $path, string $body, string $rule): void
    {
        self::assertSame([$path . '::FooTest::testWorks ' . $rule], $this->findings([$path => $this->inMethod($body)]));
        self::assertStringNotContainsString(': ' . $rule, BannedTestCallGuard::explain('x ' . $rule));
    }

    public function test_finds_a_stray_flag_switched_off_in_the_base_set_up(): void
    {
        $base = "<?php\nuse Illuminate\\Support\\Facades\\Http;\nabstract class TestCase {\n    protected function setUp(): void {\n        Http::preventStrayRequests(false);\n    }\n}\n";

        self::assertSame([self::BASE . '::TestCase::setUp stray-switch'], $this->findings([self::BASE => $base]));
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function allowedCalls(): iterable
    {
        yield 'config with an array and config reads' => [self::FEATURE, "config(['app.name' => 'x']);\n" . self::FACADES . "Config::get('app.name');"];
        yield 'a set of another class' => [self::FEATURE, self::FACADES . "Cache::set('a', 'b');\n\$collection->set('a', 'b');\napp('cache')->set('a', 'b');"];
        yield 'the clock pinned in the pure unit tier' => [self::UNIT, self::FACADES . "Date::setTestNow('2026-01-01');"];
        yield 'the clock helpers of the test case' => [self::FEATURE, "\$this->travelTo(now());\n\$this->freezeTime();\nnow()->addDay();\n\$this->travel(5)->seconds();"];
        yield 'dates from a moment and a method named time' => [self::FEATURE, "new \\DateTimeImmutable('2026-01-01');\ndate('Y', \$moment);\n\$job->time();\nFoo::time();"];
        yield 'the one binding spelling' => [self::FEATURE, 'app()->instance(Foo::class, $foo);'];
        yield 'a binding built per resolve or one that throws' => [self::FEATURE, "app()->bind(Foo::class, fn () => new Foo());\n" . self::FACADES . "App::bind(Foo::class, static fn (): never => throw new \\RuntimeException('down'));"];
        yield 'a wait through the faked sleep' => [self::FEATURE, "use Illuminate\\Support\\Sleep;\nSleep::sleep(1);\nSleep::assertSleptTimes(1);\n\$job->sleep(1);"];
        yield 'fakes of what the test expects' => [self::FEATURE, self::FACADES . "Http::fake(['*' => 'ok']);\n" . self::FACADES . "Process::fake(['ls' => 'x']);\n" . self::FACADES . "Http::get('https://example.test');"];
        yield 'files read from the disk' => [self::FEATURE, "file_get_contents(base_path('a.json'));\nfopen('php://memory', 'r');"];
        yield 'fakes with a list' => [self::FEATURE, "use Illuminate\\Support\\Facades\\Event;\nuse Illuminate\\Support\\Facades\\Queue;\nuse Illuminate\\Support\\Facades\\Bus;\nEvent::fake([Foo::class]);\nQueue::fake([Job::class]);\nBus::fake(Job::class);\nEvent::fakeFor(fn () => 1, [Foo::class]);"];
        yield 'fakes of other facades' => [self::FEATURE, self::FACADES . "Notification::fake();\n" . self::FACADES . "Storage::fake('s3');"];
        yield 'the middleware switched off on a route' => [self::FEATURE, self::FACADES . "Route::get('/x', Foo::class)->withoutMiddleware('auth');\n\$route->withoutMiddleware('auth');"];
        yield 'a status with no named assertion' => [self::FEATURE, "\$response->assertStatus(502);\n\$response->assertStatus(\$status);\n\$response->assertOk();"];
        yield 'doubles of classes outside the project' => [self::FEATURE, "use Mockery as Doubles;\nuse Laravel\\Socialite\\Contracts\\Provider;\nuse HeadlessChromium\\Page;\nDoubles::mo" . "ck(Provider::class);\n\$this->create" . 'Stub(Page::class);'];
        yield 'banned calls in a string' => [self::FEATURE, "\$source = 'sleep(1); Config::set(\"a\", 1); Queue::fa' . 'ke();';"];
    }

    #[DataProvider('allowedCalls')]
    public function test_accepts_the_spelling_the_tests_are_written_in(string $path, string $body): void
    {
        self::assertSame([], $this->findings([$path => $this->inMethod($body)]));
    }

    public function test_lets_the_base_set_up_switch_the_stray_flags_on(): void
    {
        $base = "<?php\nuse Illuminate\\Support\\Facades\\Http;\nuse Illuminate\\Support\\Facades\\Process;\nabstract class TestCase {\n    protected function setUp(): void {\n        Http::preventStrayRequests();\n        Process::preventStrayProcesses(true);\n    }\n}\n";

        self::assertSame([], $this->findings([self::BASE => $base]));
    }

    public function test_the_real_tree_holds_no_banned_call_beyond_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);
        $found = $this->guard($root)->violations();

        self::assertSame([], new ListedFindings($root . '/tests/Guards/lists/banned-test-calls.txt')->compare($found, BannedTestCallGuard::explain(...)));
    }

    private function inMethod(string $body): string
    {
        $lines = explode("\n", $body);
        $imports = array_filter($lines, static fn (string $line): bool => str_starts_with($line, 'use '));
        $statements = array_diff($lines, $imports);

        return "<?php\n\nnamespace Tests;\n\n" . implode("\n", $imports) . "\n\nfinal class FooTest {\n    public function testWorks(): void {\n" . implode("\n", $statements) . "\n    }\n}\n";
    }

    private function guard(string $root): BannedTestCallGuard
    {
        return new BannedTestCallGuard(new PhpFileInspector(), $root, 'tests', ['tests/Unit'], self::BASE, array_keys(ComposerNamespaces::autoloaded(dirname(__DIR__, 2))));
    }

    /**
     * @param array<string, string> $files
     * @return list<string>
     */
    private function findings(array $files): array
    {
        $root = SourceSandbox::create($files, '.checkout-');

        try {
            return $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }
    }
}
