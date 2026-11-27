<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\StoreEdition;
use App\Modules\Editions\Exceptions\EditionConflictException;
use App\Modules\Editions\Exceptions\EditionLimitReachedException;
use App\Modules\Editions\Support\EditionValidator;
use Illuminate\Support\Facades\Artisan;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class StoreEditionTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_it_keeps_the_id_revision_and_times_the_browser_gave(): void
    {
        $user = User::factory()->create();
        $input = resolve(EditionValidator::class)->edition(Editions::payload('zaterdagclub', [
            'revision' => 7,
            'createdAt' => 1_700,
            'updatedAt' => 2_900,
            'moneyAmount' => 'four',
            'elements' => ['space.01' => ['name' => 'Molenweg']],
        ]));

        $edition = resolve(StoreEdition::class)->handle($user, $input);

        self::assertSame($user->publicId(), $edition->user_id);
        self::assertSame('zaterdagclub', $edition->edition_id);
        self::assertSame('Zaterdagclub', $edition->name);
        self::assertSame(7, $edition->revision);
        self::assertSame(1_700, $edition->created_at_ms);
        self::assertSame(2_900, $edition->updated_at_ms);
        self::assertSame('four', $edition->money_amount);
        self::assertNull($edition->template);
        self::assertSame(['space.01' => ['name' => 'Molenweg']], $edition->elements);
        self::assertSame(1, Edition::query()->count());
    }

    public function test_the_same_id_in_the_same_account_is_a_conflict_with_the_stored_version(): void
    {
        $user = User::factory()->create();
        Editions::store($user, 'zaterdagclub', ['name' => 'Eerste']);
        $input = resolve(EditionValidator::class)->edition(Editions::payload('zaterdagclub', ['name' => 'Tweede']));

        try {
            resolve(StoreEdition::class)->handle($user, $input);
            self::fail('A second edition with the same id was stored.');
        } catch (EditionConflictException $editionConflictException) {
            self::assertSame('Eerste', $editionConflictException->current->name);
        }

        self::assertSame(1, Edition::query()->count());
    }

    public function test_the_same_id_in_another_account_is_a_new_edition(): void
    {
        $input = resolve(EditionValidator::class)->edition(Editions::payload('zaterdagclub'));
        resolve(StoreEdition::class)->handle(User::factory()->create(), $input);

        resolve(StoreEdition::class)->handle(User::factory()->create(), $input);

        self::assertSame(2, Edition::query()->where('edition_id', 'zaterdagclub')->count());
    }

    public function test_a_full_account_gets_the_limit_and_nothing_is_stored(): void
    {
        config(['printopoly.limits.editions_per_account' => 2]);
        $user = User::factory()->create();
        Editions::store($user, 'een');
        Editions::store($user, 'twee');
        $input = resolve(EditionValidator::class)->edition(Editions::payload('drie'));

        try {
            resolve(StoreEdition::class)->handle($user, $input);
            self::fail('The third edition went past the limit.');
        } catch (EditionLimitReachedException $editionLimitReachedException) {
            self::assertSame(2, $editionLimitReachedException->limit);
        }

        self::assertNull(Edition::query()->where('edition_id', 'drie')->first());
    }

    public function test_an_account_takes_a_new_edition_again_once_one_is_gone(): void
    {
        config(['printopoly.limits.editions_per_account' => 2]);
        $user = User::factory()->create();
        $gone = Editions::store($user, 'een');
        Editions::store($user, 'twee');
        $gone->delete();

        Editions::store($user, 'drie');

        $this->expectException(EditionLimitReachedException::class);
        Editions::store($user, 'vier');
    }

    public function test_an_account_with_more_editions_than_a_lowered_limit_takes_none(): void
    {
        $user = User::factory()->create();
        Editions::store($user, 'een');
        Editions::store($user, 'twee');
        Editions::store($user, 'drie');
        config(['printopoly.limits.editions_per_account' => 2]);

        $this->expectException(EditionLimitReachedException::class);
        Editions::store($user, 'vier');
    }

    public function test_two_requests_that_take_the_last_place_at_once_store_one_edition(): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        config(['printopoly.limits.editions_per_account' => 2]);
        $user = User::factory()->create();
        Editions::store($user, 'een');
        $raced = false;
        Edition::creating(static function () use ($user, &$raced): void {
            if (! $raced) {
                $raced = true;
                Editions::store($user, 'parallel');
            }
        });

        try {
            Editions::store($user, 'twee');
            self::fail('Both requests took the last place.');
        } catch (EditionLimitReachedException $editionLimitReachedException) {
            self::assertSame(2, $editionLimitReachedException->limit);
        }

        self::assertSame(['een', 'parallel'], Edition::query()->where('user_id', $user->publicId())->orderBy('edition_id')->pluck('edition_id')->all());
    }
}
