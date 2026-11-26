<?php

declare(strict_types=1);

namespace Tests\Feature\Integrations\Ssr;

use App\Integrations\Ssr\ReleaseCheckedSsrGateway;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Override;
use Tests\TestCase;

final class SsrGatewayTest extends TestCase
{
    private const string RELEASE = '0dad59b4-1978-4741-bf8e-6a56d9370ca8';

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $this->app->usePublicPath(storage_path('framework/testing/ssr-' . Str::random(8)));
        File::ensureDirectoryExists(dirname($this->artifact()));
        File::put($this->artifact(), json_encode(['id' => self::RELEASE], JSON_THROW_ON_ERROR));
        config(['inertia.ssr.enabled' => true, 'inertia.ssr.ensure_bundle_exists' => false]);
    }

    #[Override]
    protected function tearDown(): void
    {
        if (str_contains(public_path(), 'framework/testing/ssr-')) {
            File::deleteDirectory(public_path());
        }

        parent::tearDown();
    }

    public function test_an_answer_of_the_same_release_is_used(): void
    {
        Http::fake(['*' => Http::response(['head' => ['<title>x</title>'], 'body' => '<div>hi</div>', 'release' => self::RELEASE])]);

        $response = resolve(ReleaseCheckedSsrGateway::class)->dispatch(['component' => 'home']);

        self::assertNotNull($response);
        self::assertSame('<div>hi</div>', $response->body);
    }

    public function test_an_answer_of_an_older_release_is_dropped(): void
    {
        Http::fake(['*' => Http::response(['head' => [], 'body' => '<div>old</div>', 'release' => 'other'])]);

        self::assertNull(resolve(ReleaseCheckedSsrGateway::class)->dispatch(['component' => 'home']));
    }

    public function test_without_a_release_file_nothing_is_rendered_on_the_server(): void
    {
        File::delete($this->artifact());
        Http::fake();

        self::assertNull(resolve(ReleaseCheckedSsrGateway::class)->dispatch(['component' => 'home']));
        Http::assertNothingSent();
    }

    private function artifact(): string
    {
        return public_path('build/ssr-release.json');
    }
}
