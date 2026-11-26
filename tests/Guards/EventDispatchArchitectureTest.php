<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\EventDispatchGuard;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\SourceSandbox;

final class EventDispatchArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Actions;\nuse App\\Events\\EditionDeleted;\nuse Illuminate\\Support\\Facades\\Event;\nuse Illuminate\\Contracts\\Events\\Dispatcher;\nfinal class DeleteEdition\n{\n    public function __construct(private Dispatcher \$events) {}\n\n    public function handle(Dispatcher \$dispatcher): void\n    {\n";

    /**
     * @return iterable<string, array{string}>
     */
    public static function eventsBuiltForTheDispatcher(): iterable
    {
        yield 'the facade' => [self::HEAD . "        Event::dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n"];
        yield 'the facade by its global alias' => [self::HEAD . ('        \\' . 'Event::dispatch(new EditionDeleted(\'a\', \'b\'));
    }
}
')];
        yield 'an injected dispatcher' => [self::HEAD . "        \$this->events->dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n"];
        yield 'a dispatcher parameter' => [self::HEAD . "        \$dispatcher->dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n"];
        yield 'the container string' => [self::HEAD . "        app('events')->dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n"];
    }

    #[Test]
    #[DataProvider('eventsBuiltForTheDispatcher')]
    public function it_detects_an_event_of_the_application_built_to_hand_it_to_the_dispatcher(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('builds an event of the application to hand it to the dispatcher: write EditionDeleted::dispatch(...)', $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'the event dispatches itself' => [self::HEAD . "        EditionDeleted::dispatch('a', 'b');\n    }\n}\n"];
        yield 'an event built earlier' => [self::HEAD . "        \$event = new EditionDeleted('a', 'b');\n        Event::dispatch(\$event);\n    }\n}\n"];
        yield 'a vendor event' => [self::HEAD . "        Event::dispatch(new \\Illuminate\\Auth\\Events\\Logout('web', null));\n    }\n}\n"];
        yield 'dispatch() of a job' => [self::HEAD . "        \$this->bus->dispatch(new \\App\\Jobs\\GeneratePrintJob('a'));\n    }\n}\n"];
    }

    #[Test]
    #[DataProvider('nearMisses')]
    public function it_accepts_an_event_that_dispatches_itself_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

    #[Test]
    public function it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['app/Actions/DeleteEdition.php' => self::HEAD . "        Event::dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Actions/DeleteEdition.php:12: Event::dispatch(new EditionDeleted(...))', $violations[0]);
    }

    #[Test]
    public function it_finds_no_event_built_for_the_dispatcher_in_the_real_tree(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    private function guard(string $root): EventDispatchGuard
    {
        return new EventDispatchGuard(new PhpFileInspector(), $root, 'app');
    }
}
