<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\EventDispatchGuard;
use Tests\Support\SourceSandbox;

final class EventDispatchArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Actions;\nuse App\\Events\\EditionDeleted;\nuse Illuminate\\Support\\Facades\\Event;\nuse Illuminate\\Contracts\\Events\\Dispatcher;\nfinal class DeleteEdition\n{\n    public function __construct(private Dispatcher \$events) {}\n\n    public function handle(Dispatcher \$dispatcher): void\n    {\n";

    private const string EVENT = "<?php\nnamespace App\\Events;\nuse Illuminate\\Contracts\\Broadcasting\\ShouldBroadcastNow;\n";

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function eventsThatDispatchThemselvesOrADispatcherByHand(): iterable
    {
        yield 'an event with the trait' => [self::EVENT . "use Illuminate\\Foundation\\Events\\Dispatchable;\nfinal class EditionDeleted\n{\n    use Dispatchable;\n}\n", 'EditionDeleted uses Illuminate\\Foundation\\Events\\Dispatchable: dispatch the event with Event::dispatch(new EditionDeleted(...))'];
        yield 'the trait by its full name' => [self::EVENT . "final class EditionDeleted implements ShouldBroadcastNow\n{\n    use \\Illuminate\\Foundation\\Events\\Dispatchable;\n}\n", 'EditionDeleted uses Illuminate\\Foundation\\Events\\Dispatchable'];
        yield 'the trait under an alias, next to another trait' => [self::EVENT . "use Illuminate\\Foundation\\Events\\Dispatchable as Fires;\nuse Illuminate\\Queue\\SerializesModels;\nfinal class EditionDeleted\n{\n    use SerializesModels, Fires;\n}\n", 'EditionDeleted uses Illuminate\\Foundation\\Events\\Dispatchable'];
        yield 'an injected dispatcher' => [self::HEAD . "        \$this->events->dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n", 'the dispatcher dispatches an event by hand: write Event::dispatch(...)'];
        yield 'a dispatcher parameter' => [self::HEAD . "        \$dispatcher->dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n", 'the dispatcher dispatches an event by hand'];
        yield 'the container string' => [self::HEAD . "        app('events')->dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n", 'the dispatcher dispatches an event by hand'];
    }

    #[DataProvider('eventsThatDispatchThemselvesOrADispatcherByHand')]
    public function test_it_detects_an_event_that_dispatches_itself_and_a_dispatcher_called_by_hand(string $source, string $words): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString($words, $violations[0]);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function nearMisses(): iterable
    {
        yield 'the facade with a new event' => [self::HEAD . "        Event::dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n"];
        yield 'the facade with an event built earlier' => [self::HEAD . "        \$event = new EditionDeleted('a', 'b');\n        Event::dispatch(\$event);\n    }\n}\n"];
        yield 'a job with the dispatchable trait of the bus' => ["<?php\nnamespace App\\Jobs;\nuse Illuminate\\Foundation\\Bus\\Dispatchable;\nfinal class GeneratePrintJob\n{\n    use Dispatchable;\n}\n"];
        yield 'an event without the trait' => [self::EVENT . "final class EditionDeleted implements ShouldBroadcastNow\n{\n}\n"];
        yield 'dispatch() of a job' => [self::HEAD . "        \$this->bus->dispatch(new \\App\\Jobs\\GeneratePrintJob('a'));\n    }\n}\n"];
    }

    #[DataProvider('nearMisses')]
    public function test_it_accepts_the_facade_and_the_near_misses(string $source): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource($source));
    }

    public function test_it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['app/Actions/DeleteEdition.php' => self::HEAD . "        \$dispatcher->dispatch(new EditionDeleted('a', 'b'));\n    }\n}\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('app/Actions/DeleteEdition.php:12: the dispatcher dispatches an event by hand', $violations[0]);
    }

    public function test_it_finds_no_event_that_dispatches_itself_in_the_real_tree(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    private function guard(string $root): EventDispatchGuard
    {
        return new EventDispatchGuard(new CallInspector(), $root, 'app');
    }
}
