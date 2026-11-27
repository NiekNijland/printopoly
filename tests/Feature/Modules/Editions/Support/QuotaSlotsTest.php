<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Models\Edition;
use App\Modules\Editions\Support\QuotaSlots;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Artisan;
use MongoDB\Driver\Exception\BulkWriteException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class QuotaSlotsTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_document_takes_the_lowest_free_slot_and_a_full_group_takes_none(): void
    {
        Edition::factory()->createOne(['user_id' => 'sanne', 'slot' => 0]);
        Edition::factory()->createOne(['user_id' => 'sanne', 'slot' => 2]);
        Edition::factory()->createOne(['user_id' => 'thomas', 'slot' => 1]);
        $slots = resolve(QuotaSlots::class);

        self::assertNull($slots->full($this->quotas(4)));
        self::assertNull($slots->claim($this->quotas(4), $this->save('drie')));
        self::assertSame('slot', $slots->full($this->quotas(3)));
        self::assertSame('slot', $slots->claim($this->quotas(3), $this->save('vier')));

        self::assertSame([0, 1, 2], Edition::query()->where('user_id', 'sanne')->orderBy('slot')->pluck('slot')->all());
        self::assertNull(Edition::query()->where('edition_id', 'vier')->first());
    }

    public function test_documents_without_a_slot_count_toward_the_limit(): void
    {
        Edition::factory()->createOne(['user_id' => 'sanne']);
        Edition::factory()->createOne(['user_id' => 'sanne', 'slot' => 0]);

        self::assertSame('slot', resolve(QuotaSlots::class)->claim($this->quotas(2), $this->save('drie')));
    }

    public function test_a_slot_another_request_took_first_is_read_again_and_the_group_is_full(): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        Edition::factory()->createOne(['user_id' => 'sanne', 'slot' => 0]);
        $slots = resolve(QuotaSlots::class);
        $raced = false;
        $other = $this->save('parallel');

        $full = $slots->claim($this->quotas(2), function (array $taken) use ($slots, $other, &$raced): void {
            if (! $raced) {
                $raced = true;
                self::assertNull($slots->claim($this->quotas(2), $other));
            }

            $this->save('eigen')($taken);
        });

        self::assertSame('slot', $full);
        self::assertSame(['parallel'], Edition::query()->where('slot', 1)->pluck('edition_id')->all());
        self::assertNull(Edition::query()->where('edition_id', 'eigen')->first());
    }

    public function test_a_duplicate_that_is_not_a_slot_is_thrown(): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        Edition::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'twee', 'slot' => 0]);

        $this->expectException(BulkWriteException::class);
        $this->expectExceptionCode(11000);

        resolve(QuotaSlots::class)->claim($this->quotas(5), $this->save('twee'));
    }

    /**
     * @return array<string, array{Builder<Edition>, int}>
     */
    private function quotas(int $limit): array
    {
        return ['slot' => [Edition::query()->where('user_id', 'sanne'), $limit]];
    }

    /**
     * @return Closure(array<string, int>): void
     */
    private function save(string $editionId): Closure
    {
        return static function (array $slots) use ($editionId): void {
            Edition::factory()->createOne(['user_id' => 'sanne', 'edition_id' => $editionId, ...$slots]);
        };
    }
}
