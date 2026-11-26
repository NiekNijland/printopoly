<?php

declare(strict_types=1);

namespace Tests\Smoke;

use HeadlessChromium\Browser;
use HeadlessChromium\BrowserFactory;
use HeadlessChromium\Communication\Message;
use HeadlessChromium\Page;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase;
use Override;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use RuntimeException;

/**
 * Five steps against a booted stack (SMOKE_BASE_URL) that runs the production drivers: the stack's drivers, the
 * health route, both home pages in a browser, and the one write, creating an edition through the page. The app
 * is anonymous-first (Google is the only sign-in and cannot be seeded), so no user is needed. A console error
 * in the browser fails a step.
 */
#[Group('smoke')]
final class SmokeTest extends TestCase
{
    private static ?Browser $browser = null;

    #[Override]
    public function createApplication(): Application
    {
        /** @var Application $app */
        $app = require __DIR__ . '/../../bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    #[Override]
    public static function tearDownAfterClass(): void
    {
        self::$browser?->close();
        self::$browser = null;
        parent::tearDownAfterClass();
    }

    #[Test]
    public function the_stack_runs_the_production_drivers(): void
    {
        self::assertSame('redis', config('cache.default'));
        self::assertSame('redis', config('queue.default'));
        self::assertSame('mongodb', config('database.default'));
    }

    #[Test]
    public function the_health_route_answers(): void
    {
        $body = file_get_contents($this->baseUrl() . '/up');

        self::assertIsString($body);
        self::assertStringContainsString('Application up', $body);
    }

    #[Test]
    public function the_dutch_home_page_draws_without_a_console_error(): void
    {
        $errors = $this->open('/nl', 'h1');

        self::assertSame([], $errors);
    }

    #[Test]
    public function the_english_home_page_draws_without_a_console_error(): void
    {
        $errors = $this->open('/en', 'h1');

        self::assertSame([], $errors);
    }

    #[Test]
    public function an_edition_is_created_through_the_page_and_opens_in_the_editor(): void
    {
        $errors = [];
        $page = $this->page($errors);
        $page->navigate($this->baseUrl() . '/nl/editions/new')->waitForNavigation(Page::NETWORK_IDLE, 30000);
        $page->evaluate('new Promise(r => { const t = setInterval(() => { if ([...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Editie maken")) { clearInterval(t); r(true); } }, 100); })')
            ->waitForResponse(20000);
        $page->evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Editie maken").click()');
        $path = $page->evaluate('new Promise(r => { const t = setInterval(() => { if (location.pathname.includes("/editor/")) { clearInterval(t); r(location.pathname); } }, 100); })')
            ->getReturnValue(20000);

        self::assertIsString($path);
        self::assertStringContainsString('/editor/', $path);
        self::assertSame([], $errors);
        $page->close();
    }

    /**
     * @return list<string>
     */
    private function open(string $path, string $selector): array
    {
        $errors = [];
        $page = $this->page($errors);
        $page->navigate($this->baseUrl() . $path)->waitForNavigation(Page::NETWORK_IDLE, 30000);
        $found = $page->evaluate('new Promise(r => { const t = setInterval(() => { if (document.querySelector(' . json_encode($selector, JSON_THROW_ON_ERROR) . ')) { clearInterval(t); r(true); } }, 100); })')
            ->getReturnValue(20000);

        self::assertTrue($found);
        $page->close();

        return $errors;
    }

    /**
     * @param list<string> $errors
     */
    private function page(array &$errors): Page
    {
        self::$browser ??= new BrowserFactory(config()->string('laravel-pdf.chrome.chrome_binary'))->createBrowser([
            'noSandbox' => true,
            'headless' => true,
        ]);
        $page = self::$browser->createPage();
        $session = $page->getSession();
        $session->sendMessageSync(new Message('Runtime.enable'));
        $session->on('method:Runtime.exceptionThrown', static function (array $event) use (&$errors): void {
            $errors[] = 'exception: ' . json_encode($event['exceptionDetails'] ?? [], JSON_THROW_ON_ERROR);
        });
        $session->on('method:Runtime.consoleAPICalled', static function (array $event) use (&$errors): void {
            if (($event['type'] ?? '') === 'error') {
                $errors[] = 'console.error: ' . json_encode($event['args'] ?? [], JSON_THROW_ON_ERROR);
            }
        });

        return $page;
    }

    private function baseUrl(): string
    {
        $url = getenv('SMOKE_BASE_URL');

        throw_if(! is_string($url) || $url === '', RuntimeException::class, 'SMOKE_BASE_URL is not set: boot the stack and pass its address.');

        return rtrim($url, '/');
    }
}
