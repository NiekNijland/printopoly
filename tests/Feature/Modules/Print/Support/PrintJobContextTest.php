<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Print\Support;

use App\Models\Asset;
use App\Models\PrintJob;
use App\Models\User;
use App\Modules\Photos\ValueObjects\PhotoPlacement;
use App\Modules\Print\Enums\BoardForm;
use App\Modules\Print\Enums\FailureReason;
use App\Modules\Print\Enums\MoneyAmount;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Modules\Print\Support\PrintEditionReader;
use App\Modules\Print\Support\PrintJobContext;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\PrintScenario;
use Tests\TestCase;

final class PrintJobContextTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_an_anonymous_job_prints_the_copy_of_the_edition_it_carries(): void
    {
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray('Buurtfeest')]);

        $edition = resolve(PrintJobContext::class)->edition($job);

        self::assertSame('Buurtfeest', $edition->name);
        self::assertSame(1, $edition->sets);
        self::assertNull($edition->moneyAmount);
        self::assertFalse($edition->targetsDeclared);
    }

    public function test_a_job_of_an_account_reads_the_live_edition_of_its_own_owner(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $edition = PrintScenario::createEditionWithId($this, $owner, 'e-zaterdag', withPhoto: false);
        $edition->name = 'Zaterdagclub live';
        $edition->save();

        $foreign = PrintScenario::createEditionWithId($this, $stranger, 'e-zaterdag', withPhoto: false);
        $foreign->name = 'Andere club';
        $foreign->save();

        $job = PrintJob::factory()->create(['user_id' => $owner->publicId(), 'edition_id' => 'e-zaterdag', 'edition' => null]);

        self::assertSame('Zaterdagclub live', resolve(PrintJobContext::class)->edition($job)->name);
    }

    public function test_a_job_whose_edition_was_deleted_fails_with_the_edition_as_reason(): void
    {
        $job = PrintJob::factory()->create(['user_id' => User::factory()->create()->publicId(), 'edition_id' => 'e-weg', 'edition' => null]);

        try {
            resolve(PrintJobContext::class)->edition($job);
            self::fail('The edition should be missing.');
        } catch (PrintFailedException $printFailedException) {
            self::assertSame('The edition of this print job no longer exists.', $printFailedException->getMessage());
            self::assertSame(FailureReason::EDITION, $printFailedException->reason);
        }
    }

    public function test_an_edition_with_broken_elements_fails_with_the_edition_as_reason(): void
    {
        $job = PrintJob::factory()->create(['edition' => ['name' => 'Kapot', 'elements' => 'geen lijst']]);

        try {
            resolve(PrintJobContext::class)->edition($job);
            self::fail('The edition should be refused.');
        } catch (PrintFailedException $printFailedException) {
            self::assertSame('An edition has elements as an object.', $printFailedException->getMessage());
            self::assertSame(FailureReason::EDITION, $printFailedException->reason);
            self::assertNotNull($printFailedException->getPrevious());
        }
    }

    public function test_for_a_set_the_choices_and_the_measured_photo_frames_of_that_set_come_along(): void
    {
        $job = PrintJob::factory()->create([
            'edition' => PrintScenario::editionArray(),
            'choices' => ['printer' => ['skipped' => ['money'], 'moneyAmount' => 'eight', 'copies' => 3, 'boardForm' => 'whole', 'invitations' => 24]],
            'photo_targets' => ['printer' => ['space.01#photo' => ['w' => 50, 'h' => 80]], 'home' => []],
        ]);

        $edition = resolve(PrintJobContext::class)->edition($job, PrintSet::PRINTER);

        self::assertSame(MoneyAmount::EIGHT, $edition->moneyAmount);
        self::assertTrue($edition->moneyLeftOut);
        self::assertSame(3, $edition->sets);
        self::assertSame(BoardForm::WHOLE, $edition->boardForm);
        self::assertSame(24, $edition->invitations);
        self::assertTrue($edition->targetsDeclared);
        self::assertSame(['space.01#photo' => [50.0, 80.0]], $this->targets($edition->placements()));
    }

    public function test_a_set_without_measured_frames_keeps_every_photo_and_its_default_money(): void
    {
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray(), 'photo_targets' => null]);

        $edition = resolve(PrintJobContext::class)->edition($job, PrintSet::HOME);

        self::assertSame(MoneyAmount::defaultFor(PrintSet::HOME), $edition->moneyAmount);
        self::assertFalse($edition->moneyLeftOut);
        self::assertFalse($edition->targetsDeclared);
        self::assertSame(['deed.01#photo', 'space.01#photo'], array_keys($this->targets($edition->placements())));
    }

    public function test_a_deed_that_borrows_a_photo_gets_the_crop_of_its_own_frame_from_the_size_of_the_jobs_photo(): void
    {
        $data = PrintScenario::editionArray();
        $job = PrintJob::factory()->create(['edition' => $data]);
        Asset::factory()->create(['ref' => PrintScenario::PHOTO_REF, 'print_job_id' => $job->publicId(), 'width' => 800, 'height' => 600]);
        $reader = resolve(PrintEditionReader::class);

        $deed = resolve(PrintJobContext::class)->edition($job)->elements['deed.01'];

        self::assertSame($reader->fromArray($data, [PrintScenario::PHOTO_REF => ['width' => 800, 'height' => 600]])->elements['deed.01'], $deed);
        self::assertNotSame($reader->fromArray($data)->elements['deed.01'], $deed);
    }

    public function test_the_photo_size_of_another_job_is_never_used(): void
    {
        $data = PrintScenario::editionArray();
        $job = PrintJob::factory()->create(['edition' => $data]);
        $other = PrintJob::factory()->create();
        Asset::factory()->create(['ref' => PrintScenario::PHOTO_REF, 'print_job_id' => $other->publicId(), 'width' => 800, 'height' => 600]);

        $deed = resolve(PrintJobContext::class)->edition($job)->elements['deed.01'];

        self::assertSame(resolve(PrintEditionReader::class)->fromArray($data)->elements['deed.01'], $deed);
    }

    public function test_elements_held_as_an_object_still_find_the_photo_sizes(): void
    {
        $data = PrintScenario::editionArray();
        $job = PrintJob::factory()->create(['edition' => $data]);
        Asset::factory()->create(['ref' => PrintScenario::PHOTO_REF, 'print_job_id' => $job->publicId(), 'width' => 800, 'height' => 600]);
        $elements = $data['elements'];
        self::assertIsArray($elements);
        $job->edition = [...$data, 'elements' => (object) $elements];

        $deed = resolve(PrintJobContext::class)->edition($job)->elements['deed.01'];

        self::assertSame(resolve(PrintEditionReader::class)->fromArray($data, [PrintScenario::PHOTO_REF => ['width' => 800, 'height' => 600]])->elements['deed.01'], $deed);
    }

    public function test_the_assets_of_an_anonymous_job_are_its_own_uploads_by_ref(): void
    {
        $job = PrintJob::factory()->create(['edition' => PrintScenario::editionArray()]);
        $asset = Asset::factory()->create(['ref' => PrintScenario::PHOTO_REF, 'print_job_id' => $job->publicId(), 'checksum' => 'molenweg']);
        $context = resolve(PrintJobContext::class);
        $edition = $context->edition($job);

        $assets = $context->assets($job, $edition);

        self::assertSame([PrintScenario::PHOTO_REF], array_keys($assets));
        self::assertSame($asset->getKey(), $assets[PrintScenario::PHOTO_REF]->getKey());
        self::assertSame([PrintScenario::PHOTO_REF => 'molenweg'], $context->checksumsFor($edition, $assets));
        self::assertSame([], $context->checksumsFor($edition, []));
    }

    public function test_the_assets_of_an_account_come_from_its_edition_only(): void
    {
        $user = User::factory()->create();
        $edition = PrintScenario::createEditionWithId($this, $user, 'e-zaterdag', withPhoto: false);
        Asset::factory()->create(['ref' => PrintScenario::PHOTO_REF, 'user_id' => $user->publicId(), 'edition_id' => 'e-ander']);
        $job = PrintJob::factory()->create(['user_id' => $user->publicId(), 'edition_id' => $edition->edition_id, 'edition' => null]);
        $context = resolve(PrintJobContext::class);

        try {
            $context->assets($job, $context->edition($job));
            self::fail('The photo of another edition should not count.');
        } catch (PrintFailedException $printFailedException) {
            self::assertSame('A photo in the edition is missing: ' . PrintScenario::PHOTO_REF, $printFailedException->getMessage());
            self::assertSame(FailureReason::PHOTOS, $printFailedException->reason);
        }

        $own = Asset::factory()->create(['ref' => PrintScenario::PHOTO_REF, 'user_id' => $user->publicId(), 'edition_id' => 'e-zaterdag']);
        $assets = $context->assets($job, $context->edition($job));

        self::assertSame($own->getKey(), $assets[PrintScenario::PHOTO_REF]->getKey());
    }

    public function test_an_edition_without_photos_needs_no_assets(): void
    {
        $job = PrintJob::factory()->create(['edition' => ['name' => 'Zonder foto', 'language' => 'nl', 'elements' => ['space.01' => ['name' => 'Molenweg']]]]);
        $context = resolve(PrintJobContext::class);

        self::assertSame([], $context->assets($job, $context->edition($job)));
    }

    /**
     * @param list<PhotoPlacement> $placements
     * @return array<string, array{float|null, float|null}>
     */
    private function targets(array $placements): array
    {
        $targets = [];

        foreach ($placements as $placement) {
            $targets[$placement->key] = [$placement->targetWidthMm, $placement->targetHeightMm];
        }

        return $targets;
    }
}
