<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\JsonEndpointGuard;
use Tests\Support\SourceSandbox;

final class JsonEndpointArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Http\\Controllers;\nuse Illuminate\\Http\\JsonResponse;\nfinal class ShowController\n{\n    public function __invoke()\n    {\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function jsonByHand(): iterable
    {
        yield 'the response helper' => [self::HEAD . "        return response()->json(['a' => 1]);\n    }\n}\n"];
        yield 'the response helper with jsonp' => [self::HEAD . "        return response()->jsonp('cb', ['a' => 1]);\n    }\n}\n"];
        yield 'the facade' => [self::HEAD . ('        return \Illuminate' . '\Support\Facades\Response::json([\'a\' => 1]);
    }
}
')];
        yield 'the facade by its global alias' => [self::HEAD . "        return \\Response::json([]);\n    }\n}\n"];
        yield 'a JsonResponse with an array built in place' => [self::HEAD . "        return new JsonResponse(['a' => 1], 201);\n    }\n}\n"];
        yield 'a JsonResponse by its full name' => [self::HEAD . "        return new \\Illuminate\\Http\\JsonResponse([]);\n    }\n}\n"];
        yield 'an API Resource' => ["<?php\nnamespace App\\Http\\Resources;\nuse Illuminate\\Http\\Resources\\Json\\JsonResource;\nfinal class EditionResource extends JsonResource {}\n"];
        yield 'an API Resource collection under an alias' => ["<?php\nnamespace App\\Http\\Resources;\nuse Illuminate\\Http\\Resources\\Json\\ResourceCollection as Many;\nfinal class Editions extends \\Illuminate\\Http\\Resources\\Json\\ResourceCollection {}\n"];
    }

    #[DataProvider('jsonByHand')]
    public function test_it_detects_a_json_answer_that_is_not_a_data_object(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('a JSON answer that is not a Data object: return a Data object', $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'a Data object' => [self::HEAD . "        return \\App\\Data\\EditionData::from(\$this->edition);\n    }\n}\n"];
        yield 'a write that wraps a Data object with its status' => [self::HEAD . "        return new JsonResponse(\$data, 201);\n    }\n}\n"];
        yield 'a json method of another object' => [self::HEAD . "        return \$this->client->json();\n    }\n}\n"];
        yield 'a page' => [self::HEAD . "        return response()->noContent();\n    }\n}\n"];
    }

    #[DataProvider('nearMisses')]
    public function test_it_accepts_a_data_object_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

    public function test_it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['app/Http/Controllers/ShowController.php' => self::HEAD . "        return response()->json([]);\n    }\n}\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Http/Controllers/ShowController.php: line 8:', $violations[0]);
    }

    public function test_it_holds_the_real_tree_to_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], $this->guard($root)->violations());
    }

    private function guard(string $root): JsonEndpointGuard
    {
        return new JsonEndpointGuard(new CallInspector(), $root, 'app');
    }
}
