<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\ControllerAuthorizationGuard;
use Tests\Support\Architecture\HttpRefusalGuard;
use Tests\Support\SourceSandbox;

final class ControllerAuthorizationArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Http\\Controllers;\nuse Illuminate\\Support\\Facades\\Gate;\nfinal class ShowController\n{\n    public function __invoke(\$request, \$edition): void\n    {\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function refusalsInAnAction(): iterable
    {
        yield 'the gate facade' => [self::HEAD . "        Gate::authorize('view', \$edition);\n    }\n}\n"];
        yield 'the gate facade by its global alias' => [self::HEAD . "        \\Gate::allows('view', \$edition);\n    }\n}\n"];
        yield 'the gate facade under an alias' => ["<?php\nnamespace App\\Http\\Controllers;\nuse Illuminate\\Support\\Facades\\Gate as Access;\nfinal class A { public function __invoke(\$e): void { Access::denies('view', \$e); } }\n"];
        yield 'the controller trait' => [self::HEAD . "        \$this->authorize('view', \$edition);\n    }\n}\n"];
        yield 'a can() on the user' => [self::HEAD . "        \$request->user()->can('view', \$edition);\n    }\n}\n"];
        yield 'a cannot() on the user' => [self::HEAD . "        \$request->user()?->cannot('view', \$edition);\n    }\n}\n"];
        yield 'abort_unless with 401' => [self::HEAD . "        abort_unless(\$request->user() !== null, 401);\n    }\n}\n"];
        yield 'abort_if with 404' => [self::HEAD . "        abort_if(\$edition === null, 404);\n    }\n}\n"];
        yield 'abort with a fully qualified name' => [self::HEAD . "        \\abort(403);\n    }\n}\n"];
        yield 'a hand-built authorization exception' => [self::HEAD . "        throw new \\Illuminate\\Auth\\Access\\AuthorizationException();\n    }\n}\n"];
        yield 'a hand-built 403' => [self::HEAD . "        throw new \\Symfony\\Component\\HttpKernel\\Exception\\HttpException(403);\n    }\n}\n"];
    }

    #[DataProvider('refusalsInAnAction')]
    public function test_it_detects_an_action_that_checks_or_refuses_access_itself(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('an action checks or refuses access itself: put the permission on the route (can:), the rule about a record in its policy', $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'a gate of the application by another name' => [self::HEAD . "        \\App\\Support\\Gates::open();\n    }\n}\n"];
        yield 'an HTTP exception that is no refusal' => [self::HEAD . "        throw new \\Symfony\\Component\\HttpKernel\\Exception\\HttpException(409);\n    }\n}\n"];
        yield 'an abort method of another object' => [self::HEAD . "        \$this->run->abort();\n    }\n}\n"];
    }

    #[DataProvider('nearMisses')]
    public function test_it_accepts_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function refusalsOutsideHttp(): iterable
    {
        yield 'abort with 403' => ["<?php\nnamespace App\\Actions;\nfinal class A { public function handle(): void { abort(403); } }\n"];
        yield 'abort_unless with the constant' => ["<?php\nnamespace App\\Actions;\nuse Symfony\\Component\\HttpFoundation\\Response;\nfinal class A { public function handle(bool \$ok): void { abort_unless(\$ok, Response::HTTP_FORBIDDEN); } }\n"];
        yield 'an access-denied exception' => ["<?php\nnamespace App\\Actions;\nfinal class A { public function handle(): void { throw new \\Symfony\\Component\\HttpKernel\\Exception\\AccessDeniedHttpException(); } }\n"];
    }

    #[DataProvider('refusalsOutsideHttp')]
    public function test_it_detects_an_http_refusal_outside_the_http_layer(string $source): void
    {
        $violations = $this->refusalGuard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('an HTTP refusal outside the HTTP layer: throw a domain exception that extends the authorization exception', $violations[0]);
    }

    public function test_it_accepts_a_domain_refusal_and_a_404_outside_the_http_layer(): void
    {
        self::assertSame([], $this->refusalGuard(dirname(__DIR__, 2))->inSource("<?php\nnamespace App\\Actions;\nfinal class A { public function handle(): void { abort(404); throw new \\App\\Edition\\EditionLimitReached(); } }\n"));
    }

    public function test_it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            'app/Http/Controllers/ShowController.php' => self::HEAD . "        abort(403);\n    }\n}\n",
            'app/Http/Middleware/Refuse.php' => "<?php\nfinal class Refuse { public function handle(): void { abort(403); } }\n",
            'app/Actions/Refuse.php' => "<?php\nfinal class Refuse { public function handle(): void { abort(403); } }\n",
        ], '.checkout-');

        try {
            $inAction = $this->guard($root)->violations();
            $outside = $this->refusalGuard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $inAction);
        self::assertStringStartsWith('app/Http/Controllers/ShowController.php: line 8:', $inAction[0]);
        self::assertCount(1, $outside);
        self::assertStringStartsWith('app/Actions/Refuse.php: line 2:', $outside[0]);
    }

    public function test_it_holds_the_real_tree_to_its_counted_list_and_has_no_http_refusal_outside_the_http_layer(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], $this->guard($root)->violations());
        self::assertSame([], $this->refusalGuard($root)->violations());
    }

    private function guard(string $root): ControllerAuthorizationGuard
    {
        return new ControllerAuthorizationGuard(new CallInspector(), $root, 'app/Http/Controllers');
    }

    private function refusalGuard(string $root): HttpRefusalGuard
    {
        return new HttpRefusalGuard(new CallInspector(), $root, 'app', ['app/Http/']);
    }
}
