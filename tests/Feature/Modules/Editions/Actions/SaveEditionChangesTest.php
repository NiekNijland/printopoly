<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\SaveEditionChanges;
use App\Modules\Editions\Exceptions\EditionConflictException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class SaveEditionChangesTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_change_on_the_current_revision_is_saved_with_the_next_revision(): void
    {
        $edition = Editions::store(User::factory()->create(), 'zaterdagclub', ['revision' => 3]);

        $saved = resolve(SaveEditionChanges::class)->handle($edition, 3, [
            'name' => 'Zondagclub',
            'elements' => ['space.01' => ['name' => 'Kerkstraat']],
        ]);

        self::assertSame('Zondagclub', $saved->name);
        self::assertSame(4, $saved->revision);
        self::assertSame(['space.01' => ['name' => 'Kerkstraat']], $saved->elements);
        self::assertGreaterThan(1_000, $saved->updated_at_ms);
    }

    public function test_a_larger_browser_revision_carries_over_and_a_smaller_one_does_not(): void
    {
        $edition = Editions::store(User::factory()->create(), 'zaterdagclub', ['revision' => 3]);

        $ahead = resolve(SaveEditionChanges::class)->handle($edition, 3, ['name' => 'Na de trein'], 9);
        $behind = resolve(SaveEditionChanges::class)->handle($ahead, 9, ['name' => 'Thuis'], 2);

        self::assertSame(9, $ahead->revision);
        self::assertSame(10, $behind->revision);
    }

    public function test_a_stale_base_revision_is_a_conflict_and_nothing_is_written(): void
    {
        $edition = Editions::store(User::factory()->create(), 'zaterdagclub', ['revision' => 3]);

        try {
            resolve(SaveEditionChanges::class)->handle($edition, 2, ['name' => 'Oud venster']);
            self::fail('A stale change was saved.');
        } catch (EditionConflictException $editionConflictException) {
            self::assertSame(3, $editionConflictException->current->revision);
        }

        self::assertSame('Zaterdagclub', Edition::query()->where('edition_id', 'zaterdagclub')->firstOrFail()->name);
    }

    public function test_another_window_that_saved_in_between_wins_and_the_caller_gets_its_version(): void
    {
        $edition = Editions::store(User::factory()->create(), 'zaterdagclub', ['revision' => 3]);
        $otherWindow = Edition::query()->where('edition_id', 'zaterdagclub')->firstOrFail();
        resolve(SaveEditionChanges::class)->handle($otherWindow, 3, ['name' => 'Ander venster']);

        try {
            resolve(SaveEditionChanges::class)->handle($edition, 3, ['name' => 'Dit venster']);
            self::fail('The change overwrote the other window.');
        } catch (EditionConflictException $editionConflictException) {
            self::assertSame('Ander venster', $editionConflictException->current->name);
            self::assertSame(4, $editionConflictException->current->revision);
        }

        self::assertSame('Ander venster', Edition::query()->where('edition_id', 'zaterdagclub')->firstOrFail()->name);
    }
}
