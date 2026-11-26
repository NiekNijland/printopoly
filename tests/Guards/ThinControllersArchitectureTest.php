<?php

declare(strict_types=1);

namespace Tests\Guards;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CountedList;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\ThinControllerGuard;
use Tests\Support\SourceSandbox;

final class ThinControllersArchitectureTest extends TestCase
{
    private const array FACADES = [DB::class];

    private const array COLLABORATORS = ['\\Actions\\', '\\Services\\'];

    /**
     * @return iterable<string, array{string, list<string>}>
     */
    public static function controllerWrites(): iterable
    {
        yield 'a transaction on the facade' => ["use Illuminate\\Support\\Facades\\DB;\nDB::transaction(fn () => null);", ['DB::']];
        yield 'the facade by its full name' => ['$collection = \\Illuminate\\Support\\Facades\\DB' . '::connection();', ['DB::']];
        yield 'the facade by its global alias' => ["\\DB::table('x')->get();", ['DB::']];
        yield 'the facade under an alias' => ["use Illuminate\\Support\\Facades\\DB as Database;\nDatabase::table('x')->get();", ['DB::']];
        yield 'a lock' => ['$box = CollectionBox::query()->lockForUpdate()->find(1);', ['lockforupdate()']];
        yield 'save' => ['$box->save();', ['save()']];
        yield 'save on a relation' => ['$box->contributions()->save($contribution);', ['save()']];
        yield 'update on a model' => ["\$box->update(['closed_at' => now()]);", ['update()']];
        yield 'a static create' => ['CollectionBox::create([]);', ['create()']];
        yield 'create on a query' => ['CollectionBox::query()->create([]);', ['create()']];
        yield 'delete' => ['$asset->delete();', ['delete()']];
        yield 'a nullsafe delete' => ['$asset?->delete();', ['delete()']];
        yield 'force delete' => ['$asset->forceDelete();', ['forcedelete()']];
        yield 'insert' => ['CollectionBox::query()->insert([]);', ['insert()']];
        yield 'upsert' => ["CollectionBox::query()->upsert([], ['id']);", ['upsert()']];
        yield 'increment' => ["\$box->increment('count');", ['increment()']];
        yield 'update or create' => ['CollectionBox::query()->updateOrCreate([], []);', ['updateorcreate()']];
        yield 'first or create' => ['CollectionBox::query()->firstOrCreate([]);', ['firstorcreate()']];
        yield 'a write name in capitals' => ['$box->SAVE();', ['save()']];
        yield 'two saves' => ['$box->save(); $photo->save();', ['save()', 'save()']];
        yield 'a method injected service' => ['$service->delete(1);', ['delete()']];
    }

    /**
     * @param list<string> $calls
     */
    #[Test]
    #[DataProvider('controllerWrites')]
    public function it_detects_a_write_lock_or_transaction_in_a_controller(string $body, array $calls): void
    {
        self::assertSame($calls, $this->guard($this->root())->inSource($this->controller($body)));
    }

    #[Test]
    public function it_detects_a_write_through_a_property_that_is_not_an_action_or_a_service(): void
    {
        $source = "<?php\nnamespace App\\Http\\Controllers\\Boxes;\nuse App\\Models\\CollectionBox;\nfinal readonly class CloseBoxController { public function __construct(private CollectionBox \$box) {} public function __invoke(): void { \$this->box->save(); } }\n";

        self::assertSame(['save()'], $this->guard($this->root())->inSource($source));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function controllersThatCallAnActionOrAService(): iterable
    {
        yield 'a promoted action' => ["<?php\nnamespace App\\Http\\Controllers\\Boxes;\nuse App\\Modules\\Boxes\\Actions\\CloseBox;\nfinal readonly class CloseBoxController { public function __construct(private CloseBox \$closeBox) {} public function __invoke(\$box): void { \$this->closeBox->handle(\$box); } }\n"];
        yield 'an action called with a write name' => ["<?php\nnamespace App\\Http\\Controllers\\Boxes;\nuse App\\Modules\\Boxes\\Actions\\UpdateBox;\nfinal readonly class UpdateBoxController { public function __construct(private UpdateBox \$update) {} public function __invoke(\$box): void { \$this->update->update(\$box); } }\n"];
        yield 'a service with a write name, nullsafe' => ["<?php\nnamespace App\\Http\\Controllers\\Boxes;\nuse App\\Modules\\Boxes\\Services\\BoxService;\nfinal readonly class DeleteBoxController { public function __construct(private ?BoxService \$boxes) {} public function __invoke(\$box): void { \$this->boxes?->delete(\$box); } }\n"];
        yield 'an action kept in a typed property' => ["<?php\nnamespace App\\Http\\Controllers\\Boxes;\nuse App\\Modules\\Boxes\\Actions\\StoreBox;\nfinal class StoreBoxController { private StoreBox \$store; public function __construct(StoreBox \$store) { \$this->store = \$store; } public function __invoke(\$box): void { \$this->store->create(\$box); } }\n"];
        yield 'reads, a collection and a redirect' => ["<?php\nnamespace App\\Http\\Controllers\\Boxes;\nfinal class ListBoxesController { public function __invoke(): void { \$boxes = CollectionBox::query()->where('id', 1)->get(); collect(\$boxes)->push(1); back(); } }\n"];
    }

    #[Test]
    #[DataProvider('controllersThatCallAnActionOrAService')]
    public function it_accepts_a_controller_that_calls_an_action_or_a_service_it_gets_through_its_constructor(string $source): void
    {
        self::assertSame([], $this->guard($this->root())->inSource($source));
    }

    #[Test]
    public function it_keys_each_write_by_its_file_call_and_occurrence_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create([
            'app/Http/Controllers/Boxes/StoreBoxController.php' => $this->controller('$box->save(); $asset->delete(); $photo->save();'),
            'app/Http/Controllers/Boxes/ShowBoxController.php' => $this->controller('back();'),
        ], prefix: '.checkout-');

        try {
            $guard = $this->guard($root);
            $findings = $guard->findings();
            $explained = $guard->explain($findings);
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertSame(['app/Http/Controllers/Boxes/StoreBoxController.php::delete()#1', 'app/Http/Controllers/Boxes/StoreBoxController.php::save()#1', 'app/Http/Controllers/Boxes/StoreBoxController.php::save()#2'], $findings);
        self::assertStringContainsString('Move it into an action of the module and call the action', implode("\n", $explained));
    }

    #[Test]
    public function it_keeps_controllers_free_of_writes_locks_and_transactions_or_lists_them(): void
    {
        $guard = $this->guard($this->root());

        self::assertSame([], new CountedList($this->root(), 'lists/thin-controllers.txt')->violations($guard->findings(), $guard->explain(...)));
    }

    private function guard(string $root): ThinControllerGuard
    {
        return new ThinControllerGuard(new PhpFileInspector(), $root, 'app/Http/Controllers', self::FACADES, self::COLLABORATORS);
    }

    private function controller(string $body): string
    {
        return "<?php\nnamespace App\\Http\\Controllers\\Boxes;\n" . (str_starts_with($body, 'use ') ? mb_substr($body, 0, (int) mb_strpos($body, "\n") + 1) : '') . 'final class BoxController { public function __invoke($box, $asset, $photo, $service, $contribution): void { ' . (str_starts_with($body, 'use ') ? mb_substr($body, (int) mb_strpos($body, "\n") + 1) : $body) . " } }\n";
    }

    private function root(): string
    {
        return dirname(__DIR__, 2);
    }
}
