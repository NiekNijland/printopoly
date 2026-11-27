<?php

declare(strict_types=1);

namespace Tests\Unit\Modules\Editions\Support;

use App\Modules\Editions\Support\ElementMigration;
use PHPUnit\Framework\TestCase;

final class ElementMigrationTest extends TestCase
{
    public function test_an_old_bank_key_moves_under_words_and_the_moved_key_wins(): void
    {
        self::assertSame(['words.bank' => ['name' => 'A']], ElementMigration::keys(['bank' => ['name' => 'A']]));
        self::assertSame(['words.bank' => ['name' => 'B']], ElementMigration::keys(['bank' => ['name' => 'A'], 'words.bank' => ['name' => 'B']]));
    }

    public function test_the_elements_that_are_gone_are_dropped(): void
    {
        self::assertSame(['space.01' => []], ElementMigration::keys(['dice' => [], 'fold_models' => [], 'space.01' => []]));
    }

    public function test_a_value_that_is_no_array_passes_unchanged(): void
    {
        self::assertSame('nope', ElementMigration::migrate('nope'));
        self::assertNull(ElementMigration::migrate(null));
        self::assertSame(['words.bank' => 1], ElementMigration::migrate(['bank' => 1]));
    }
}
