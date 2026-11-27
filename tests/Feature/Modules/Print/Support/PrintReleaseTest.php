<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Modules\Print\Support\PrintRelease;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class PrintReleaseTest extends TestCase
{
    public function test_a_configured_release_is_used_as_it_is(): void
    {
        config(['printopoly.print.release' => 'ronde-zeven']);

        self::assertSame('ronde-zeven', PrintRelease::current());
    }

    public function test_without_a_release_and_without_a_build_it_is_dev(): void
    {
        config(['printopoly.print.release' => '']);
        $public = $this->emptyPublicPath('geen-build');

        self::assertSame('dev', PrintRelease::current());

        File::deleteDirectory($public);
    }

    public function test_without_a_release_it_is_the_start_of_the_hash_of_the_manifest(): void
    {
        config(['printopoly.print.release' => null]);
        $public = $this->emptyPublicPath('met-build');
        File::ensureDirectoryExists($public . '/build');
        File::put($public . '/build/manifest.json', '{"app.ts":"eerste"}');

        self::assertSame(substr(hash('sha256', '{"app.ts":"eerste"}'), 0, 16), PrintRelease::current());

        File::deleteDirectory($public);
    }

    public function test_the_hash_is_kept_per_file_version_and_a_new_build_gets_a_new_one(): void
    {
        config(['printopoly.print.release' => '']);
        $public = $this->emptyPublicPath('nieuwe-build');
        File::ensureDirectoryExists($public . '/build');
        $manifest = $public . '/build/manifest.json';
        File::put($manifest, '{"app.ts":"aaaa"}');
        touch($manifest, 1_700_000_000);
        clearstatcache();
        $first = PrintRelease::current();

        File::put($manifest, '{"app.ts":"bbbb"}');
        touch($manifest, 1_700_000_000);
        clearstatcache();
        self::assertSame($first, PrintRelease::current(), 'same time and size: read from the cache');

        File::put($manifest, '{"app.ts":"langer"}');
        clearstatcache();
        self::assertSame(substr(hash('sha256', '{"app.ts":"langer"}'), 0, 16), PrintRelease::current());

        File::deleteDirectory($public);
    }

    private function emptyPublicPath(string $name): string
    {
        $public = storage_path('framework/testing/print-release-' . $name);
        File::deleteDirectory($public);
        File::ensureDirectoryExists($public);
        app()->usePublicPath($public);

        return $public;
    }
}
