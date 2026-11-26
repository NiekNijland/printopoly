<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Models\Edition;
use App\Models\User;
use App\Modules\Accounts\Actions\DeleteAccount;
use App\Modules\Boxes\Support\BoxCleanup;
use App\Modules\Editions\Actions\DeleteEdition;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Console\Output\BufferedOutput;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\Support\BoxScenario;
use Tests\Support\Editions;
use Tests\TestCase;

final class BoxLifecycleTest extends TestCase
{
    use RefreshesMongoDatabase;
    use UsesLocalBoxDisk;

    public function test_deleting_the_edition_removes_its_boxes(): void
    {
        $user = User::factory()->create();
        $edition = Editions::store($user, 'edition-0001');
        $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'A', 'snapshot' => []])->assertCreated();
        $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0002', 'editionName' => 'B', 'snapshot' => []])->assertCreated();
        $token = CollectionBox::query()->where('edition_id', 'edition-0001')->firstOrFail()->token;
        BoxScenario::contribute($this, $token, ['photo' => BoxScenario::photo()])->assertCreated();

        resolve(DeleteEdition::class)->handle($edition);

        self::assertSame(['edition-0002'], CollectionBox::query()->pluck('edition_id')->all());
        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_deleting_the_account_removes_its_boxes_and_files(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $this->actingAs($user)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'A', 'snapshot' => []])->assertCreated();
        $this->actingAs($other)->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'Andere', 'snapshot' => []])->assertCreated();
        $token = CollectionBox::query()->where('user_id', $user->publicId())->firstOrFail()->token;
        BoxScenario::contribute($this, $token, ['photo' => BoxScenario::photo()])->assertCreated();

        resolve(DeleteAccount::class)->handle($user);

        self::assertSame(1, CollectionBox::query()->count());
        self::assertSame('Andere', CollectionBox::query()->firstOrFail()->edition_name);
        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
        self::assertNull(Edition::query()->where('user_id', $user->publicId())->first());
    }

    public function test_the_cleanup_removes_boxes_thirty_days_after_the_last_activity(): void
    {
        $quiet = BoxScenario::makeBox($this);
        $busy = BoxScenario::makeBox($this, ['editionId' => 'edition-0002']);
        BoxScenario::contribute($this, $quiet['token'], ['photo' => BoxScenario::photo()])->assertCreated();

        $this->travelTo(CarbonImmutable::now()->addDays(20));
        BoxScenario::contribute($this, $busy['token'], ['photo' => BoxScenario::photo()])->assertCreated();

        $this->travelTo(CarbonImmutable::now()->addDays(15));
        $output = new BufferedOutput();
        self::assertSame(0, Artisan::call('printopoly:cleanup-boxes', [], $output));
        self::assertStringContainsString('Removed 1 boxes and 1 contributions.', $output->fetch());

        self::assertNull(CollectionBox::query()->find($quiet['id']));
        self::assertNotNull(CollectionBox::query()->find($busy['id']), 'a contribution 15 days ago kept it alive');
        self::assertCount(2, Storage::disk('local')->allFiles(), 'only the photo of the box that is left');
    }

    public function test_the_cleanup_also_removes_contributions_of_a_box_that_is_already_gone(): void
    {
        $box = BoxScenario::makeBox($this);
        BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo()])->assertCreated();
        CollectionBox::query()->where('_id', $box['id'])->delete();

        $counts = resolve(BoxCleanup::class)->run();

        self::assertSame(['boxes' => 0, 'contributions' => 1], $counts);
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_the_cleanup_is_scheduled_daily(): void
    {
        $events = collect(resolve(Schedule::class)->events())
            ->filter(static fn (\Illuminate\Console\Scheduling\Event $event): bool => str_contains((string) $event->command, 'printopoly:cleanup-boxes'));

        self::assertCount(1, $events);
        self::assertSame('45 3 * * *', $events->first()?->expression);
    }
}
