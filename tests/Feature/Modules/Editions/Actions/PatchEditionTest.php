<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\PatchEdition;
use App\Modules\Editions\Exceptions\EditionConflictException;
use App\Modules\Editions\Support\EditionValidator;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class PatchEditionTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_only_the_fields_in_the_patch_change(): void
    {
        $edition = Editions::store(User::factory()->create(), 'zaterdagclub', ['revision' => 2, 'theme' => 'classic']);
        $patch = resolve(EditionValidator::class)->patch(['baseRevision' => 2, 'name' => 'Zondagclub', 'moneyAmount' => 'four']);

        $saved = resolve(PatchEdition::class)->handle($edition, $patch);

        self::assertSame('Zondagclub', $saved->name);
        self::assertSame('four', $saved->money_amount);
        self::assertSame('classic', $saved->theme);
        self::assertSame('nl', $saved->language);
        self::assertSame(3, $saved->revision);
    }

    public function test_an_element_with_null_loses_its_override_and_the_others_stay(): void
    {
        $edition = Editions::store(User::factory()->create(), 'zaterdagclub', ['elements' => [
            'space.01' => ['name' => 'Molenweg'],
            'space.02' => ['name' => 'Dorpsstraat'],
        ]]);
        $patch = resolve(EditionValidator::class)->patch(['baseRevision' => 0, 'elements' => [
            'space.01' => null,
            'space.03' => ['name' => 'Kerkplein'],
        ]]);

        $saved = resolve(PatchEdition::class)->handle($edition, $patch);

        self::assertSame(['space.02' => ['name' => 'Dorpsstraat'], 'space.03' => ['name' => 'Kerkplein']], $saved->elements);
    }

    public function test_the_print_selection_and_board_profile_are_stored_under_their_column_names(): void
    {
        $edition = Editions::store(User::factory()->create(), 'zaterdagclub');
        $profile = ['id' => 'eigen', 'name' => 'Eigen bord', 'outer' => 520, 'corner' => 72, 'border' => 0, 'panels' => 4, 'boxLid' => ['w' => 267, 'h' => 267]];
        $patch = resolve(EditionValidator::class)->patch(['baseRevision' => 0, 'printSelection' => null, 'boardProfile' => $profile]);

        $saved = resolve(PatchEdition::class)->handle($edition, $patch);

        self::assertNull($saved->print_selection);
        self::assertSame(520, $saved->board_profile['outer'] ?? null);
        self::assertSame('Eigen bord', $saved->board_profile['name'] ?? null);
    }

    public function test_a_stale_patch_is_turned_away_before_anything_is_merged(): void
    {
        $edition = Editions::store(User::factory()->create(), 'zaterdagclub', ['revision' => 4]);
        $patch = resolve(EditionValidator::class)->patch(['baseRevision' => 3, 'name' => 'Oud']);

        try {
            resolve(PatchEdition::class)->handle($edition, $patch);
            self::fail('A stale patch was saved.');
        } catch (EditionConflictException $editionConflictException) {
            self::assertSame(4, $editionConflictException->current->revision);
        }

        self::assertSame('Zaterdagclub', Edition::query()->where('edition_id', 'zaterdagclub')->firstOrFail()->name);
    }
}
