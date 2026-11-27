<?php

declare(strict_types=1);

namespace Tests\Guards;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\Architecture\PhpFileInspector;
use Tests\Support\Architecture\QuotaCountGuard;
use Tests\Support\SourceSandbox;

final class QuotaCountArchitectureTest extends TestCase
{
    /**
     * @return iterable<string, array{string}>
     */
    public static function limitsCheckedByCounting(): iterable
    {
        yield 'a count of a query against a limit' => ["<?php\nif (Edition::query()->where('user_id', \$id)->count() >= \$limit) { throw new Full(); }\n"];
        yield 'a count of a query held in a variable' => ["<?php\n\$query = Photo::query()->where('box_id', \$id);\nthrow_if(\$query->count() >= Config::integer('max'), Full::class);\n"];
        yield 'room while the count stays below the limit' => ["<?php\nif (\$query->count() < 50) { \$photo->save(); }\n"];
        yield 'the limit on the left' => ["<?php\nif (\$max <= \$query->count()) { return; }\n"];
        yield 'past the limit' => ["<?php\nif (\$query->count() > \$max - 1) { return; }\n"];
        yield 'a nullsafe count' => ["<?php\nif (\$box?->contributions()?->count() >= \$max) { return; }\n"];
    }

    #[DataProvider('limitsCheckedByCounting')]
    public function test_it_detects_a_limit_checked_by_counting_before_an_insert(string $source): void
    {
        self::assertStringContainsString('quota-count: a limit checked by counting the documents and inserting after', implode("\n", $this->guard('')->inSource($source)));
    }

    public function test_it_accepts_a_count_that_asks_for_any_document_a_count_of_an_array_and_a_count_that_is_shown(): void
    {
        $root = SourceSandbox::create(['app/Modules/Boxes/Actions/Announce.php' => "<?php\n"
            . "if (\$query->count() > 0 || \$query->count() >= 1 || 1 <= \$query->count()) { \$any = true; }\n"
            . "if (count(\$held) >= \$limit) { return null; }\n"
            . "\$event = new BoxActivityEvent(\$box, \$query->count());\n"
            . "if (\$items->count(\$filter) >= 3) { return; }\n"], '.checkout-');

        try {
            self::assertSame([], $this->guard($root)->violations());
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_it_names_the_file_and_line_under_a_dot_directory(): void
    {
        $root = SourceSandbox::create(['app/Modules/Editions/Actions/StoreEdition.php' => "<?php\n\nthrow_if(Edition::query()->count() >= \$limit, Full::class);\n"], '.checkout-');

        try {
            self::assertSame(['app/Modules/Editions/Actions/StoreEdition.php:3 quota-count: a limit checked by counting the documents and inserting after: two requests count the same number and both insert. Claim a slot with QuotaSlots, whose unique index holds the limit'], $this->guard($root)->violations());
        } finally {
            SourceSandbox::remove($root);
        }
    }

    public function test_no_limit_is_checked_by_counting(): void
    {
        self::assertSame([], $this->guard(dirname(__DIR__, 2))->violations());
    }

    private function guard(string $root): QuotaCountGuard
    {
        return new QuotaCountGuard(new PhpFileInspector(), $root, 'app');
    }
}
