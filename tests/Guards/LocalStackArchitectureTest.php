<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CiExamples;
use Tests\Support\Architecture\LocalStackGuard;
use Tests\Support\SourceSandbox;

final class LocalStackArchitectureTest extends TestCase
{
    private const string COMPOSE = 'compose.yaml';

    private const string DOCKERFILE = 'docker/8.5/Dockerfile';

    private const string WORKFLOW = '.github/workflows/kit-checks.yml';

    /**
     * @return iterable<string, array{array{string, string, string, string}, string}>
     */
    public static function unpinnedStacks(): iterable
    {
        $stack = self::stack();

        yield 'a database on the moving tag' => [self::with($stack, 0, "image: 'mongo:8'", "image: 'mongodb/mongodb-atlas-local:latest'"), 'the service `mongodb` runs the image `mongodb/mongodb-atlas-local:latest`, which names no version'];
        yield 'a cache without a tag' => [self::with($stack, 0, "image: 'redis:8-alpine'", "image: 'redis'"), 'the service `redis` runs the image `redis`, which names no version'];
        yield 'a cache on a variant tag' => [self::with($stack, 0, "image: 'redis:8-alpine'", "image: 'redis:alpine'"), 'the service `redis` runs the image `redis:alpine`, which names no version'];
        yield 'a database of another version than CI' => [self::with($stack, 0, "image: 'mongo:8'", "image: 'mongo:7'"), 'the service `mongodb` runs `mongo:7` and CI runs `mongo:8`'];
        yield 'a Node of another version than .nvmrc' => [self::with($stack, 2, 'ARG NODE_VERSION=24.18.0', 'ARG NODE_VERSION=24'), 'ARG NODE_VERSION is `24` and .nvmrc says `v24.18.0`'];
        yield 'a Chrome of another version than CI' => [self::with($stack, 1, 'chrome-headless-shell@131.0.6778.33', 'chrome-headless-shell@132.0.6834.0'), 'ARG CHROME_VERSION is `131.0.6778.33` and CI installs chrome-headless-shell@132.0.6834.0'];
        yield 'a build that does not check its Chrome' => [self::with($stack, 2, ' --version | grep -F "$CHROME_VERSION"', ' --version'), 'the build does not check the Chrome it installed'];
        yield 'a global npm package without a version' => [self::with($stack, 2, 'pnpm@12.23.0 bun@1.4.5', 'pnpm bun@1.4.5'), '`npm install -g pnpm` installs no exact version'];
        yield 'a global npm package on a range' => [self::with($stack, 2, 'bun@1.4.5', 'bun@^1.4'), '`npm install -g bun@^1.4` installs no exact version'];
        yield 'a tool run by npx without a version' => [self::with($stack, 2, 'npx -y playwright@$PLAYWRIGHT_VERSION install-deps', 'npx -y playwright install-deps'), '`npx -y playwright` installs no exact version'];
        yield 'a composer package on a range' => [self::with($stack, 2, 'cpx/cpx:2.1.0', 'cpx/cpx:^2.0'), '`composer global require cpx/cpx:^2.0` installs no exact version'];
        yield 'a package manager on a moving tag' => [self::with($stack, 2, 'yarn@4.18.1', 'yarn@stable'), '`corepack prepare yarn@stable` installs no exact version'];
        yield 'Node from the newest of its major' => [self::with($stack, 2, 'nodejs=$NODE_VERSION-1nodesource1', 'nodejs'), '`apt-get install -y nodejs` installs the newest Node of the major'];
        yield 'the newest Composer' => [self::with($stack, 2, ' --version=2.11.2', ''), 'the composer installer runs without `--version=<version>`'];
    }

    /**
     * @param array{string, string, string, string} $stack
     */
    #[DataProvider('unpinnedStacks')]
    public function test_it_detects_a_local_stack_that_is_not_pinned_or_differs_from_ci(array $stack, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->inStack($stack)));
    }

    public function test_it_accepts_a_built_service_a_digest_and_a_job_without_services(): void
    {
        $stack = self::with(self::stack(), 0, "image: 'redis:8-alpine'", "image: 'redis@sha256:" . str_repeat('a', 64) . "'");
        $stack[1] = CiExamples::change($stack[1], 'image: redis:8-alpine', 'image: redis@sha256:' . str_repeat('a', 64));

        self::assertSame([], $this->inStack(self::stack()));
        self::assertSame([], $this->inStack($stack));
        self::assertSame([], $this->inStack(self::with(self::stack(), 0, "image: sail-8.5/printopoly\n", "image: sail-8.5/printopoly:latest\n")));
    }

    public function test_it_reads_a_tree_under_a_dot_directory_and_says_when_a_file_is_missing(): void
    {
        [$compose, $workflow, $dockerfile, $nodeVersion] = self::stack();
        $root = SourceSandbox::create([self::COMPOSE => $compose, self::WORKFLOW => $workflow, self::DOCKERFILE => $dockerfile, '.nvmrc' => $nodeVersion], '.checkout-');

        try {
            self::assertSame([], $this->guard($root)->violations());

            file_put_contents($root . '/.nvmrc', "v24.22.3\n");
            self::assertStringContainsString('ARG NODE_VERSION is `24.18.0` and .nvmrc says `v24.22.3`', implode("\n", $this->guard($root)->violations()));
            self::assertSame(['the file compose.yml does not exist: the local stack is read from it'], new LocalStackGuard($root, 'compose.yml', '.github/workflows', self::DOCKERFILE, '.nvmrc')->violations());
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_it_keeps_the_local_stack_pinned_and_equal_to_ci(): void
    {
        self::assertSame([], $this->guard(self::root())->violations());
    }

    /**
     * @param array{string, string, string, string} $stack
     * @return list<string>
     */
    private function inStack(array $stack): array
    {
        return $this->guard('')->inStack($stack[0], ['kit-checks.yml' => $stack[1]], $stack[2], $stack[3]);
    }

    private function guard(string $root): LocalStackGuard
    {
        return new LocalStackGuard($root, self::COMPOSE, '.github/workflows', self::DOCKERFILE, '.nvmrc');
    }

    /**
     * @return array{string, string, string, string} compose.yaml, the workflow, the Dockerfile and .nvmrc
     */
    private static function stack(): array
    {
        $file = static fn (string $path): string => (string) file_get_contents(self::root() . '/' . $path);

        return [$file(self::COMPOSE), $file(self::WORKFLOW), $file(self::DOCKERFILE), $file('.nvmrc')];
    }

    /**
     * @param array{string, string, string, string} $stack
     * @param 0|1|2|3 $index
     * @return array{string, string, string, string}
     */
    private static function with(array $stack, int $index, string $from, string $to): array
    {
        $stack[$index] = CiExamples::change($stack[$index], $from, $to);

        return $stack;
    }

    private static function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
