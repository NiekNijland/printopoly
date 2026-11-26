<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\RequestValidationGuard;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class RequestValidationArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Http\\Controllers;\nuse Illuminate\\Http\\Request;\nfinal class StoreController\n{\n    public function __invoke(Request \$request): void\n    {\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function validationByHand(): iterable
    {
        yield 'the request method' => [self::HEAD . "        \$request->validate(['name' => ['required']]);\n    }\n}\n"];
        yield 'the request method with a bag' => [self::HEAD . "        \$request->validateWithBag('a', ['name' => ['required']]);\n    }\n}\n"];
        yield 'the request helper' => [self::HEAD . "        request()->validate(['name' => ['required']]);\n    }\n}\n"];
        yield 'the facade' => [self::HEAD . ('        \Illuminate' . '\Support\Facades\Validator::make($request->all(), [\'name\' => [\'required\']]);
    }
}
')];
        yield 'the facade by its global alias' => [self::HEAD . "        \\Validator::validate(\$request->all(), ['name' => ['required']]);\n    }\n}\n"];
        yield 'the facade under an alias' => ["<?php\nnamespace App\\Http\\Controllers;\nuse Illuminate\\Support\\Facades\\Validator as Check;\nfinal class A { public function b(array \$data): void { Check::make(\$data, []); } }\n"];
    }

    #[DataProvider('validationByHand')]
    public function test_it_detects_a_request_validated_outside_a_form_request(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('a request is validated by hand: write the rules in a form request', $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'the validated input' => [self::HEAD . "        \$request->validated();\n    }\n}\n"];
        yield 'a validate method of another object' => [self::HEAD . "        \$this->edition->validate(['a']);\n    }\n}\n"];
        yield 'a Validator class of the application' => ['<?php
namespace App;
final class A { public function b(): void { \App' . '\Edition\EditionValidator::check([]); } }
'];
    }

    #[DataProvider('nearMisses')]
    public function test_it_accepts_the_validated_input_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

        public function test_it_reads_a_tree_under_a_dot_directory_and_leaves_the_form_requests_alone(): void
        {
        $root = SourceSandbox::create([
            'app/Http/Controllers/StoreController.php' => self::HEAD . "        \$request->validate([]);\n    }\n}\n",
            'app/Http/Requests/StoreRequest.php' => self::HEAD . "        \$request->validate([]);\n    }\n}\n",
        ], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Http/Controllers/StoreController.php: line 8:', $violations[0]);
    }

        public function test_it_holds_the_real_tree_to_its_counted_list(): void
        {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/inline-validation.txt')->differences($this->guard($root)->violations()));
    }

    private function guard(string $root): RequestValidationGuard
    {
        return new RequestValidationGuard(new CallInspector(), $root, 'app', ['app/Http/Requests/']);
    }
}
