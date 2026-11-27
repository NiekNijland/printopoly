<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\CallInspector;
use Tests\Support\Architecture\MigrationClassGuard;
use Tests\Support\CountedList;
use Tests\Support\SourceSandbox;

final class MigrationClassArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string}>
     */
    public static function migrationsThatNameAnApplicationClass(): iterable
    {
        yield 'an import' => ["<?php\nuse App\\Models\\Edition;\nreturn new class { public function up(): void { Edition::query()->get(); } };\n"];
        yield 'a fully qualified name' => ['<?php
return new class { public function up(): void { \App' . '\Edition\EditionPayload::migrated([]); } };
'];
        yield 'a group import' => ["<?php\nuse App\\Models\\{Edition, User};\nreturn new class {};\n"];
    }

    #[DataProvider('migrationsThatNameAnApplicationClass')]
    public function test_it_detects_a_migration_that_names_an_application_class(string $source): void
    {
        $violations = $this->guard(dirname(__DIR__, 2))->inSource($source);

        self::assertCount(1, $violations);
        self::assertStringContainsString('a migration names an application class: write the table, the column and the value as they are', $violations[0]);
    }

    public function test_it_accepts_a_migration_of_strings_and_the_query_builder(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->inSource("<?php\nuse Illuminate\\Support\\Facades\\Schema;\nuse MongoDB\\Laravel\\Schema\\Blueprint;\nreturn new class { public function up(): void { Schema::table('editions', fn (Blueprint \$t) => \$t->index('user_id')); } };\n"));
    }

    public function test_it_reads_a_tree_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['database/migrations/2026_01_01_000000_a.php' => "<?php\nuse App\\Models\\Edition;\n"], '.checkout-');

        try {
            $violations = $this->guard($root)->violations();
        } finally {
            SourceSandbox::remove($root);
        }

        self::assertCount(1, $violations);
        self::assertStringStartsWith('database/migrations/2026_01_01_000000_a.php: a migration names', $violations[0]);
    }

    public function test_it_holds_the_real_tree_to_its_counted_list(): void
    {
        $root = dirname(__DIR__, 2);

        self::assertSame([], new CountedList($root . '/tests/Support/Architecture/lists/migration-classes.txt')->differences($this->guard($root)->violations()));
    }

    private function guard(string $root): MigrationClassGuard
    {
        return new MigrationClassGuard(new CallInspector(), $root, 'database/migrations', 'App\\');
    }
}
