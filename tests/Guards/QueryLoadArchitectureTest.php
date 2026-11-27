<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\QueryLoadGuard;
use Tests\Support\SourceSandbox;

final class QueryLoadArchitectureTest extends TestCase
{
    private const string HEAD = "<?php\nnamespace App\\Modules\\Boxes\\Support;\nuse App\\Models\\Box;\nuse App\\Models\\Photo;\nfinal class BoxCleanup\n{\n";

    /**
     * @return iterable<string, array{string, bool, string}>
     */
    public static function queriesThatReadTooMuch(): iterable
    {
        yield 'a get() in a cleanup class' => [self::HEAD . "public function run(): void { foreach (Box::query()->where('expires_at', '<', now())->get() as \$box) { \$box->delete(); } }\n}\n", true, '7 load-all get(): a cleanup class loads every matching document at once'];
        yield 'every id plucked in a cleanup class' => [self::HEAD . "public function ids(): array { return Box::query()->pluck('id')->all(); }\n}\n", true, '7 load-all pluck()'];
        yield 'a static all() in a cleanup class' => [self::HEAD . "public function run(): void { foreach (Box::all() as \$box) { \$box->delete(); } }\n}\n", true, '7 load-all all()'];
        yield 'a get() after a nullsafe call in a cleanup class' => [self::HEAD . "public function run(): void { \$x = Box::query()->where('a', 1)?->get(); }\n}\n", true, '7 load-all get()'];
        yield 'a query in a loop over a query' => [self::HEAD . "public function run(): void { foreach (Box::query()->lazyById() as \$box) { \$photos = Photo::query()->where('box_id', \$box->id)->get(); } }\n}\n", false, '7 query-in-loop Photo::query()->get(): a loop over the documents of a query reads with a query per pass'];
        yield 'a query in a loop over a variable that holds a query' => [self::HEAD . "public function run(): void {\n\$boxes = Box::query()->get();\nforeach (\$boxes as \$box) { Photo::query()->where('box_id', \$box->id)->count(); }\n}\n}\n", false, '9 query-in-loop Photo::query()->count()'];
        yield 'a query in a method the loop calls, two calls deep' => [self::HEAD . "public function run(): void { foreach (Box::query()->get() as \$box) { \$this->one(\$box); } }\nprivate function one(Box \$box): void { \$this->two(\$box); }\nprivate function two(Box \$box): void { Photo::query()->where('box_id', \$box->id)->first(); }\n}\n", false, '7 query-in-loop Photo::query()->first() via $this->two() via $this->one()'];
    }

    #[DataProvider('queriesThatReadTooMuch')]
    public function test_it_detects_a_load_of_a_whole_collection_or_a_query_per_pass(string $source, bool $cleanup, string $reason): void
    {
        self::assertStringContainsString($reason, implode("\n", $this->guard('')->inSource($source, $cleanup)));
    }

    public function test_it_accepts_streamed_bounded_and_batched_queries_and_reads_only_cleanup_classes_for_a_load(): void
    {
        $streamed = self::HEAD . "public function run(): void {\n"
            . "Box::query()->where('expires_at', '<', now())->chunkById(100, function (\$boxes): void { foreach (\$boxes->all() as \$box) { \$box->delete(); } });\n"
            . "\$latest = Box::query()->latest()->limit(10)->get();\n"
            . "\$first = Box::query()->take(5)->pluck('id');\n"
            . "}\n}\n";
        $batched = "<?php\nnamespace App\\Modules\\Print\\Services;\nuse App\\Models\\Box;\nuse App\\Models\\Photo;\nfinal class Readiness\n{\n"
            . "public function all(): array {\n"
            . "\$boxes = Box::query()->get();\n"
            . "\$photos = Photo::query()->whereIn('box_id', \$boxes->modelKeys())->get();\n"
            . "foreach (\$boxes as \$box) { \$this->mark(\$box); Box::query()->whereKey(\$box->id)->update(['seen' => true]); }\n"
            . "foreach ([1, 2] as \$set) { Photo::query()->where('set', \$set)->count(); }\n"
            . "foreach (Box::query()->lazyById() as \$box) { \$this->other->read(\$box); }\n"
            . "return \$photos->all();\n"
            . "}\n"
            . "private function mark(Box \$box): void { \$box->seen = true; }\n"
            . "}\n";
        $root = SourceSandbox::create([
            'app/Modules/Boxes/Support/BoxCleanup.php' => $streamed,
            'app/Modules/Print/Services/Readiness.php' => $batched,
            'app/Modules/Print/Support/PrintPresenter.php' => "<?php\nfinal class PrintPresenter { public function all(): array { return \\App\\Models\\Box::query()->get()->all(); } }\n",
        ], '.checkout-');

        try {
            self::assertSame([], $this->guard($root)->violations());
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_it_names_the_file_of_a_violation_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['app/Modules/Print/Support/PrintCleanup.php' => self::HEAD . "public function run(): void { Box::query()->get(); }\n}\n"], '.checkout-');

        try {
            self::assertSame(['app/Modules/Print/Support/PrintCleanup.php:7 load-all get(): a cleanup class loads every matching document at once. Stream them with chunkById() where they are deleted, lazyById() for a read, or bound the query with limit()'], $this->guard($root)->violations());
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_the_cleanup_classes_stream_and_no_loop_reads_per_pass(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    private function guard(string $root): QueryLoadGuard
    {
        return new QueryLoadGuard(new PhpFileInspector(), $root, 'app', 'Support', 'Cleanup');
    }
}
