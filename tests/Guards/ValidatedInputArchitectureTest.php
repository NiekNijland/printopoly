<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\ValidatedInputGuard;
use Tests\Support\SourceSandbox;

final class ValidatedInputArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Http\\Controllers;\nuse Illuminate\\Http\\Request;\nfinal class StoreController\n{\n    public function __invoke(Request \$request): void\n    {\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function rawReads(): iterable
    {
        yield 'input()' => [self::HEAD . "        \$request->input('name');\n    }\n}\n"];
        yield 'a typed reader' => [self::HEAD . "        \$request->string('name');\n    }\n}\n"];
        yield 'boolean()' => [self::HEAD . "        \$request->boolean('open');\n    }\n}\n"];
        yield 'a file' => [self::HEAD . "        \$request->file('photo');\n    }\n}\n"];
        yield 'the whole input' => [self::HEAD . "        \$request->all();\n    }\n}\n"];
        yield 'nullsafe' => [self::HEAD . "        \$request?->query('page');\n    }\n}\n"];
        yield 'the request helper with a key' => [self::HEAD . "        request('name');\n    }\n}\n"];
        yield 'the request helper chained' => [self::HEAD . "        request()->input('name');\n    }\n}\n"];
        yield 'the facade' => [self::HEAD . ('        \Illuminate' . '\Support\Facades\Request::input(\'name\');
    }
}
')];
        yield 'a held request' => ["<?php\nnamespace App;\nfinal class A { public function b(): void { \$this->request->get('a'); } }\n"];
    }

    #[DataProvider('rawReads')]
    public function test_it_detects_request_input_read_past_the_form_request(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('request input read past the form request: read it from $request->validated()', $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'the validated input' => [self::HEAD . "        \$request->validated('name');\n    }\n}\n"];
        yield 'the user and the route' => [self::HEAD . "        \$request->user();\n        \$request->route('token');\n        \$request->ip();\n    }\n}\n"];
        yield 'input() on another object' => [self::HEAD . "        \$this->form->input('name');\n    }\n}\n"];
        yield 'the request helper without a key' => [self::HEAD . "        request();\n    }\n}\n"];
    }

    #[DataProvider('nearMisses')]
    public function test_it_accepts_validated_input_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

        public function test_it_reads_a_tree_under_a_dot_directory(): void
        {
        $root = SourceSandbox::create(['app/Http/Controllers/StoreController.php' => self::HEAD . "        \$request->input('a');\n    }\n}\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Http/Controllers/StoreController.php:line 8:', $violations[0]);
    }

        public function test_it_holds_the_real_tree_to_its_counted_list(): void
        {
        $root = dirname(__DIR__, 2);

        self::assertSame([], $this->guard($root)->violations());
    }

    private function guard(string $root): ValidatedInputGuard
    {
        return new ValidatedInputGuard(new CallInspector(), $root, 'app/Http/Controllers');
    }
}
