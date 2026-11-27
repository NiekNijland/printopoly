<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Actions;

use App\Models\BoxContribution;
use App\Models\CollectionBox;
use App\Modules\Boxes\Actions\AddContribution;
use App\Modules\Boxes\Events\BoxActivityEvent;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\Support\BoxScenario;
use Tests\TestCase;

final class AddContributionTest extends TestCase
{
    use RefreshesMongoDatabase;
    use UsesLocalBoxDisk;

    public function test_a_friend_adds_a_tidied_name_and_the_box_lives_longer(): void
    {
        Event::fake([BoxActivityEvent::class]);
        $this->travelTo(CarbonImmutable::parse('2026-11-20 12:00:00'));
        $box = CollectionBox::factory()->createOne(['token' => 'box-token-molen']);
        $this->travelTo(CarbonImmutable::parse('2026-11-22 09:30:00'));

        $contribution = resolve(AddContribution::class)->handle('box-token-molen', 'space.01', " Sanne\n", "  Kerk\tstraat ", null, null, '10.0.0.7');

        $stored = BoxContribution::query()->whereKey($contribution->publicId())->firstOrFail();
        self::assertSame($box->publicId(), $stored->box_id);
        self::assertSame('space.01', $stored->element_key);
        self::assertSame('Sanne', $stored->first_name);
        self::assertSame('Kerk straat', $stored->value);
        self::assertNull($stored->amount);
        self::assertNull($stored->print_path);
        self::assertSame(32, mb_strlen($stored->receipt, '8bit'));
        self::assertSame(hash_hmac('sha256', '10.0.0.7', Config::string('app.key')), $stored->ip_hash);
        $box->refresh();
        self::assertSame('2026-11-22 09:30:00', $box->last_activity_at->toDateTimeString());
        self::assertSame('2026-12-22 09:30:00', $box->expires_at->toDateTimeString());
        Event::assertDispatched(BoxActivityEvent::class, static fn (BoxActivityEvent $event): bool => $event->pending === 1);
    }

    public function test_a_card_takes_an_amount_without_a_text_and_a_long_first_name_is_cut(): void
    {
        CollectionBox::factory()->createOne(['token' => 'box-token-kaart']);

        $contribution = resolve(AddContribution::class)->handle('box-token-kaart', 'card.chance.07', str_repeat('Sanne', 10), '', -50, null, '10.0.0.8');

        self::assertSame(-50, $contribution->amount);
        self::assertNull($contribution->value);
        self::assertSame(mb_substr(str_repeat('Sanne', 10), 0, 30), $contribution->first_name);
    }

    public function test_a_photo_is_kept_with_the_contribution(): void
    {
        $box = CollectionBox::factory()->createOne(['token' => 'box-token-foto']);

        $contribution = resolve(AddContribution::class)->handle('box-token-foto', 'pawn.01', 'Sanne', '', null, BoxScenario::photo(), '10.0.0.9');

        self::assertSame('local', $contribution->disk);
        self::assertIsString($contribution->print_path);
        self::assertStringStartsWith('box-photos/' . $box->publicId() . '/', $contribution->print_path);
        self::assertSame([800, 600], [$contribution->width, $contribution->height]);
        Storage::disk('local')->assertExists($contribution->print_path);
        self::assertNull($contribution->value);
    }

    public function test_a_link_that_is_gone_answers_410(): void
    {
        $rejected = $this->rejection(static fn (): BoxContribution => resolve(AddContribution::class)->handle('box-token-weg', 'space.01', 'Sanne', 'Kerkstraat', null, null, '10.0.0.1'));

        self::assertSame(410, $rejected->status);
        self::assertSame(['box'], array_keys($rejected->errors()));
    }

    public function test_a_closed_box_answers_409(): void
    {
        CollectionBox::factory()->createOne(['token' => 'box-token-dicht', 'status' => CollectionBox::CLOSED]);

        $rejected = $this->rejection(static fn (): BoxContribution => resolve(AddContribution::class)->handle('box-token-dicht', 'space.01', 'Sanne', 'Kerkstraat', null, null, '10.0.0.1'));

        self::assertSame(409, $rejected->status);
        self::assertSame(['box'], array_keys($rejected->errors()));
        self::assertSame(0, BoxContribution::query()->count());
    }

    /**
     * @return array<string, array{string, string, string, int|null, bool, string}>
     */
    public static function refusals(): array
    {
        return [
            'a space friends cannot reach' => ['board_center', 'Sanne', 'Lisa en Thomas', null, false, 'elementKey'],
            'an amount out of range' => ['card.chance.07', 'Sanne', '', 1_000_000, false, 'amount'],
            'a photo for a colour group' => ['group.brown', 'Sanne', 'Zwolle', null, true, 'photo'],
            'no first name' => ['space.01', " \t", 'Kerkstraat', null, false, 'firstName'],
            'nothing to add' => ['space.01', 'Sanne', '  ', null, false, 'value'],
            'a name that is too long' => ['space.01', 'Sanne', str_repeat('Molenweg', 6), null, false, 'value'],
            'a link as value' => ['space.01', 'Sanne', 'www.molenweg.nl', null, false, 'value'],
            'a link as first name' => ['space.01', 'sanne.nl', 'Kerkstraat', null, false, 'value'],
        ];
    }

    #[DataProvider('refusals')]
    public function test_a_contribution_that_breaks_a_rule_is_refused(string $key, string $firstName, string $value, ?int $amount, bool $photo, string $field): void
    {
        CollectionBox::factory()->createOne(['token' => 'box-token-regels']);
        $file = $photo ? BoxScenario::photo() : null;

        $rejected = $this->rejection(static fn (): BoxContribution => resolve(AddContribution::class)->handle('box-token-regels', $key, $firstName, $value, $amount, $file, '10.0.0.1'));

        self::assertSame(422, $rejected->status);
        self::assertSame([$field], array_keys($rejected->errors()));
        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_a_full_box_takes_nothing_more(): void
    {
        config(['printopoly.boxes.max_contributions' => 1]);
        $box = CollectionBox::factory()->createOne(['token' => 'box-token-vol']);
        BoxContribution::factory()->createOne(['box_id' => $box->publicId()]);

        $rejected = $this->rejection(static fn (): BoxContribution => resolve(AddContribution::class)->handle('box-token-vol', 'space.01', 'Sanne', 'Kerkstraat', null, null, '10.0.0.1'));

        self::assertSame(409, $rejected->status);
        self::assertSame(['box'], array_keys($rejected->errors()));
    }

    public function test_a_box_full_of_photos_still_takes_a_name_but_no_photo(): void
    {
        config(['printopoly.boxes.max_photos' => 1]);
        $box = CollectionBox::factory()->createOne(['token' => 'box-token-fotos']);
        BoxContribution::factory()->createOne(['box_id' => $box->publicId(), 'print_path' => 'box-photos/oud/print.jpg']);
        $add = resolve(AddContribution::class);

        $rejected = $this->rejection(static fn (): BoxContribution => $add->handle('box-token-fotos', 'space.01', 'Sanne', '', null, BoxScenario::photo(), '10.0.0.1'));
        $add->handle('box-token-fotos', 'space.01', 'Sanne', 'Kerkstraat', null, null, '10.0.0.1');

        self::assertSame(409, $rejected->status);
        self::assertSame(['photo'], array_keys($rejected->errors()));
        self::assertSame(2, BoxContribution::query()->count());
    }

    public function test_a_full_box_refuses_on_the_box_before_the_photo_and_keeps_no_file(): void
    {
        config(['printopoly.boxes.max_contributions' => 1, 'printopoly.boxes.max_photos' => 0]);
        $box = CollectionBox::factory()->createOne(['token' => 'box-token-alles-vol']);
        BoxContribution::factory()->createOne(['box_id' => $box->publicId()]);

        $rejected = $this->rejection(static fn (): BoxContribution => resolve(AddContribution::class)->handle('box-token-alles-vol', 'space.01', 'Sanne', '', null, BoxScenario::photo(), '10.0.0.1'));

        self::assertSame(409, $rejected->status);
        self::assertSame(['box'], array_keys($rejected->errors()));
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_a_full_box_takes_a_contribution_and_a_photo_again_once_one_is_gone(): void
    {
        config(['printopoly.boxes.max_contributions' => 2, 'printopoly.boxes.max_photos' => 1]);
        CollectionBox::factory()->createOne(['token' => 'box-token-ruimte']);
        $add = resolve(AddContribution::class);
        $first = $add->handle('box-token-ruimte', 'space.01', 'Sanne', '', null, BoxScenario::photo(), '10.0.0.1');
        $add->handle('box-token-ruimte', 'space.01', 'Thomas', 'Dorpsstraat', null, null, '10.0.0.1');
        $full = $this->rejection(static fn (): BoxContribution => $add->handle('box-token-ruimte', 'space.01', 'Eva', 'Brink', null, null, '10.0.0.1'));
        $first->delete();

        $add->handle('box-token-ruimte', 'space.01', 'Bram', '', null, BoxScenario::photo(), '10.0.0.1');

        self::assertSame(409, $full->status);
        self::assertSame(['Bram', 'Thomas'], BoxContribution::query()->orderBy('first_name')->pluck('first_name')->all());
    }

    public function test_two_friends_who_take_the_last_place_at_once_leave_one_contribution(): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        config(['printopoly.boxes.max_contributions' => 1]);
        CollectionBox::factory()->createOne(['token' => 'box-token-race']);
        $add = resolve(AddContribution::class);
        $this->raceOnce(static fn (): BoxContribution => $add->handle('box-token-race', 'space.01', 'Thomas', 'Dorpsstraat', null, null, '10.0.0.2'));

        $rejected = $this->rejection(static fn (): BoxContribution => $add->handle('box-token-race', 'space.01', 'Sanne', 'Kerkstraat', null, null, '10.0.0.1'));

        self::assertSame(409, $rejected->status);
        self::assertSame(['box'], array_keys($rejected->errors()));
        self::assertSame(['Thomas'], BoxContribution::query()->pluck('first_name')->all());
    }

    public function test_two_photos_for_the_last_photo_place_at_once_keep_one_photo_and_its_files(): void
    {
        self::assertSame(0, Artisan::call('migrate'));
        config(['printopoly.boxes.max_photos' => 1]);
        CollectionBox::factory()->createOne(['token' => 'box-token-foto-race']);
        $add = resolve(AddContribution::class);
        $this->raceOnce(static fn (): BoxContribution => $add->handle('box-token-foto-race', 'space.01', 'Thomas', '', null, BoxScenario::photo(), '10.0.0.2'));

        $rejected = $this->rejection(static fn (): BoxContribution => $add->handle('box-token-foto-race', 'space.01', 'Sanne', '', null, BoxScenario::photo(), '10.0.0.1'));
        $kept = BoxContribution::query()->sole();

        self::assertSame(409, $rejected->status);
        self::assertSame(['photo'], array_keys($rejected->errors()));
        self::assertSame('Thomas', $kept->first_name);
        self::assertEqualsCanonicalizing([$kept->preview_path, $kept->print_path], Storage::disk('local')->allFiles());
    }

    public function test_a_file_that_is_no_photo_is_refused_on_the_photo_field(): void
    {
        CollectionBox::factory()->createOne(['token' => 'box-token-tekst']);
        $file = UploadedFile::fake()->createWithContent('vakantie.jpg', 'geen foto maar tekst');

        $rejected = $this->rejection(static fn (): BoxContribution => resolve(AddContribution::class)->handle('box-token-tekst', 'space.01', 'Sanne', '', null, $file, '10.0.0.1'));

        self::assertSame(['photo'], array_keys($rejected->errors()));
        self::assertSame(0, BoxContribution::query()->count());
    }

    public function test_live_news_that_fails_is_reported_and_the_contribution_stays(): void
    {
        Exceptions::fake([RuntimeException::class]);
        Event::listen(BoxActivityEvent::class, static function (): never {
            throw new RuntimeException('Reverb is down.');
        });
        CollectionBox::factory()->createOne(['token' => 'box-token-stil']);

        resolve(AddContribution::class)->handle('box-token-stil', 'space.01', 'Sanne', 'Kerkstraat', null, null, '10.0.0.1');

        self::assertSame(1, BoxContribution::query()->count());
        Exceptions::assertReported(static fn (RuntimeException $exception): bool => $exception->getMessage() === 'Reverb is down.');
    }

    /**
     * @param Closure(): BoxContribution $add
     */
    private function raceOnce(Closure $other): void
    {
        $raced = false;

        BoxContribution::creating(static function () use ($other, &$raced): void {
            if (! $raced) {
                $raced = true;
                $other();
            }
        });
    }

    private function rejection(Closure $add): ValidationException
    {
        try {
            $add();
        } catch (ValidationException $validationException) {
            return $validationException;
        }

        self::fail('The contribution was not refused.');
    }
}
