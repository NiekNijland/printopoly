<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\FormRequestGuard;
use Tests\Support\SourceSandbox;

/**
 * The project has no form request yet (step 8 writes them): the real-tree case reads the folder when it exists.
 */
final class FormRequestArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Http\\Requests;\nuse Illuminate\\Foundation\\Http\\FormRequest;\nfinal class StoreBoxRequest extends FormRequest\n{\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function requestsOfAnotherShape(): iterable
    {
        yield 'authorize() that only returns true' => [self::HEAD . "    public function authorize(): bool { return true; }\n}\n", 'authorize() that only returns true: remove the method'];
        yield 'the rules of a field as one string' => [self::HEAD . "    public function rules(): array { return ['name' => 'required|string']; }\n}\n", "the rules of a field as one string: write them as an array, ['required', 'string']"];
        yield 'the rules joined from text' => [self::HEAD . "    public function rules(): array { return ['name' => 'required|' . 'string']; }\n}\n", 'the rules of a field as text that is held in a variable or joined'];
        yield 'the rules held in a variable' => [self::HEAD . "    public function rules(): array { \$r = 'required'; return ['name' => \$r]; }\n}\n", 'the rules of a field as text that is held in a variable or joined'];
    }

    #[DataProvider('requestsOfAnotherShape')]
    public function test_it_detects_a_form_request_of_another_shape(string $source, string $reason): void
    {
        $violations = new FormRequestGuard(new CallInspector(), dirname(__DIR__, 2), 'app/Http/Requests')->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
    }

        public function test_it_accepts_rules_as_arrays_an_authorize_that_reads_the_input_and_an_override(): void
        {
        $guard = new FormRequestGuard(new CallInspector(), dirname(__DIR__, 2), 'app/Http/Requests');

        self::assertSame([], $guard->inSource(self::HEAD . "    public function authorize(): bool { return \$this->input('a') !== null; }\n    public function rules(): array { return ['name' => ['required', 'string']]; }\n}\n"));
        self::assertSame([], $guard->inSource(self::HEAD . "    #[\\Override]\n    public function authorize(): bool { return true; }\n}\n"));
    }

        public function test_it_reads_a_tree_under_a_dot_directory(): void
        {
        $root = SourceSandbox::create(['app/Http/Requests/StoreBoxRequest.php' => self::HEAD . "    public function authorize(): bool { return true; }\n}\n"], '.checkout-');

        try {
            $violations = new FormRequestGuard(new CallInspector(), $root, 'app/Http/Requests')->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Http/Requests/StoreBoxRequest.php:6: authorize()', $violations[0]);
    }

        public function test_it_gives_every_form_request_of_the_real_tree_its_shape(): void
        {
        $root = dirname(__DIR__, 2);

        self::assertSame([], is_dir($root . '/app/Http/Requests') ? new FormRequestGuard(new CallInspector(), $root, 'app/Http/Requests')->violations() : []);
    }
}
