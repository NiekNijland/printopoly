<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Models\Edition;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\MongoIndexes;
use Tests\TestCase;

final class QuotaSlotIndexesTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_stored_documents_get_the_lowest_free_slots_of_their_group(): void
    {
        $box = CollectionBox::factory()->createOne();
        $other = CollectionBox::factory()->createOne();
        $photo = ['print_path' => 'box-photos/a/print.jpg'];
        $first = BoxContribution::factory()->createOne(['box_id' => $box->publicId(), ...$photo]);
        $second = BoxContribution::factory()->createOne(['box_id' => $box->publicId()]);
        $third = BoxContribution::factory()->createOne(['box_id' => $box->publicId(), 'slot' => 0, 'photo_slot' => 0, ...$photo]);
        $alone = BoxContribution::factory()->createOne(['box_id' => $other->publicId(), ...$photo]);
        Edition::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'een']);
        Edition::factory()->createOne(['user_id' => 'sanne', 'edition_id' => 'twee']);
        Edition::factory()->createOne(['user_id' => 'thomas', 'edition_id' => 'een']);

        self::assertSame(0, Artisan::call('migrate'));

        self::assertSame([1, 2, 0, 0], array_map($this->slotOf(...), [$first, $second, $third, $alone]));
        self::assertSame([1, null, 0, 0], array_map(static fn (BoxContribution $contribution): ?int => $contribution->fresh()?->photo_slot, [$first, $second, $third, $alone]));
        self::assertSame([0, 1], Edition::query()->where('user_id', 'sanne')->orderBy('edition_id')->pluck('slot')->all());
        self::assertSame([0], Edition::query()->where('user_id', 'thomas')->pluck('slot')->all());
        self::assertContains(['user_id' => 1, 'slot' => 1], MongoIndexes::keys('editions'));
        self::assertContains(['box_id' => 1, 'slot' => 1], MongoIndexes::keys('box_contributions'));
        self::assertContains(['box_id' => 1, 'photo_slot' => 1], MongoIndexes::keys('box_contributions'));
    }

    public function test_rolling_back_takes_the_slots_away(): void
    {
        Edition::factory()->createOne(['user_id' => 'sanne']);
        self::assertSame(0, Artisan::call('migrate'));
        $migration = require database_path('migrations/2026_11_27_120000_create_quota_slot_indexes.php');
        self::assertInstanceOf(Migration::class, $migration);
        self::assertTrue(method_exists($migration, 'down'));
        $migration->down();

        self::assertSame(0, Edition::query()->whereNotNull('slot')->count());
    }

    private function slotOf(BoxContribution $contribution): ?int
    {
        return $contribution->fresh()?->slot;
    }
}
