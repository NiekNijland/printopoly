<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\FlashMessageGuard;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class FlashMessageArchitectureTest extends TestCase
{
    private const array KEYS = ['success', 'error', 'info'];

    private const string HEAD = "<?php\nnamespace App\\Http\\Controllers;\nuse Inertia\\Inertia;\nfinal class StoreController\n{\n    public function __invoke(\$request)\n    {\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function flashMessagesOfAnotherForm(): iterable
    {
        yield 'another key' => [self::HEAD . "        Inertia::flash('clearLocalCopy', true);\n    }\n}\n", "a flash message under 'clearLocalCopy': flash under one of the keys success, error, info"];
        yield 'a literal line' => [self::HEAD . "        Inertia::flash('success', 'Saved');\n    }\n}\n", 'a flash message that is not one translated line'];
        yield 'an array of lines' => [self::HEAD . "        Inertia::flash('error', [__('a.b'), __('a.c')]);\n    }\n}\n", 'a flash message that is not one translated line'];
        yield 'the facade by its full name' => [self::HEAD . ('        \Inertia' . '\Inertia::flash(\'warning\', __(\'a.b\'));
    }
}
'), "a flash message under 'warning'"];
        yield 'on a named redirect' => [self::HEAD . "        return to_route('home')->with('status', __('a.b'));\n    }\n}\n", "a flash message under 'status'"];
        yield 'on back()' => [self::HEAD . "        return back()->with('success', 'Saved');\n    }\n}\n", 'a flash message that is not one translated line'];
        yield 'on a redirect facade' => [self::HEAD . ('        return \Illuminate' . '\Support\Facades\Redirect::to(\'/\')->with(\'message\', __(\'a.b\'));
    }
}
'), "a flash message under 'message'"];
        yield 'the session helper' => [self::HEAD . "        session()->flash('success', __('a.b'));\n    }\n}\n", 'a flash message written to the session'];
        yield 'the session of the request' => [self::HEAD . "        \$request->session()->flash('success', __('a.b'));\n    }\n}\n", 'a flash message written to the session'];
        yield 'the session facade' => [self::HEAD . ('        \Illuminate' . '\Support\Facades\Session::flash(\'success\', __(\'a.b\'));
    }
}
'), 'a flash message written to the session'];
    }

    #[DataProvider('flashMessagesOfAnotherForm')]
    public function test_it_detects_a_flash_message_of_another_form(string $source, string $reason): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($reason, $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function oneTranslatedLine(): iterable
    {
        yield 'the Inertia flash' => [self::HEAD . "        Inertia::flash('error', __('auth.google_failed'));\n    }\n}\n"];
        yield 'on a redirect' => [self::HEAD . "        return back()->with('success', __('a.b', ['n' => 1]));\n    }\n}\n"];
        yield 'with() of a query' => [self::HEAD . ('        \App' . '\Models\Edition::query()->with(\'assets\')->get();
    }
}
')];
        yield 'a session read' => [self::HEAD . "        \$request->session()->put('locale', 'nl');\n    }\n}\n"];
    }

    #[DataProvider('oneTranslatedLine')]
    public function test_it_accepts_one_translated_line_under_a_fixed_key_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

        public function test_it_reads_a_tree_under_a_dot_directory(): void
        {
        $root = SourceSandbox::create(['app/Http/Controllers/StoreController.php' => self::HEAD . "        Inertia::flash('done', true);\n    }\n}\n"], '.checkout-');

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

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/flash-messages.txt')->differences($this->guard($root)->violations()));
    }

    private function guard(string $root): FlashMessageGuard
    {
        return new FlashMessageGuard(new CallInspector(), $root, 'app', self::KEYS);
    }
}
