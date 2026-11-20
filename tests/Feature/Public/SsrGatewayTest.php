<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Support\ReleaseCheckedSsrGateway;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SsrGatewayTest extends TestCase
{
    private const string RELEASE = '0dad59b4-1978-4741-bf8e-6a56d9370ca8';

    private string $artifact;

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $this->artifact = public_path('build/ssr-release.json');
        File::ensureDirectoryExists(dirname($this->artifact));
        File::put($this->artifact, json_encode(['id' => self::RELEASE], JSON_THROW_ON_ERROR));
        config(['inertia.ssr.enabled' => true, 'inertia.ssr.ensure_bundle_exists' => false]);
    }

    #[Override]
    protected function tearDown(): void
    {
        File::delete($this->artifact);

        parent::tearDown();
    }

    #[Test]
    public function an_answer_of_the_same_release_is_used(): void
    {
        Http::fake(['*' => Http::response(['head' => ['<title>x</title>'], 'body' => '<div>hi</div>', 'release' => self::RELEASE])]);

        $response = app(ReleaseCheckedSsrGateway::class)->dispatch(['component' => 'home']);

        $this->assertNotNull($response);
        $this->assertSame('<div>hi</div>', $response->body);
    }

    #[Test]
    public function an_answer_of_an_older_release_is_dropped(): void
    {
        Http::fake(['*' => Http::response(['head' => [], 'body' => '<div>old</div>', 'release' => 'other'])]);

        $this->assertNull(app(ReleaseCheckedSsrGateway::class)->dispatch(['component' => 'home']));
    }

    #[Test]
    public function without_a_release_file_nothing_is_rendered_on_the_server(): void
    {
        File::delete($this->artifact);
        Http::fake();

        $this->assertNull(app(ReleaseCheckedSsrGateway::class)->dispatch(['component' => 'home']));
        Http::assertNothingSent();
    }
}
