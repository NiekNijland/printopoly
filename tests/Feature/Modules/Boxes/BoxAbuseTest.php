<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes;

use App\Models\BoxContribution;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Concerns\UsesLocalBoxDisk;
use Tests\Support\BoxScenario;
use Tests\TestCase;

final class BoxAbuseTest extends TestCase
{
    use RefreshesMongoDatabase;
    use UsesLocalBoxDisk;

    public function test_a_contribution_needs_a_first_name_and_something_to_add(): void
    {
        $box = BoxScenario::makeBox($this);

        BoxScenario::contribute($this, $box['token'], ['firstName' => ' '])->assertUnprocessable();
        BoxScenario::contribute($this, $box['token'], ['value' => ''])->assertUnprocessable();
        BoxScenario::contribute($this, $box['token'], ['value' => str_repeat('x', 41)])->assertUnprocessable();
        BoxScenario::contribute($this, $box['token'], ['elementKey' => 'card.chance.02', 'value' => str_repeat('x', 201)])->assertUnprocessable();
    }

    public function test_links_in_names_and_texts_are_refused(): void
    {
        $box = BoxScenario::makeBox($this);

        BoxScenario::contribute($this, $box['token'], ['value' => 'Bezoek www.goedkoop.example'])->assertUnprocessable();
        BoxScenario::contribute($this, $box['token'], ['value' => 'https://spam.example'])->assertUnprocessable();
        BoxScenario::contribute($this, $box['token'], ['firstName' => 'koop.nl'])->assertUnprocessable();
        self::assertSame(0, BoxContribution::query()->count());
    }

    public function test_the_honeypot_looks_like_success_but_stores_nothing(): void
    {
        $box = BoxScenario::makeBox($this);

        BoxScenario::contribute($this, $box['token'], ['website' => 'https://bot.example'])->assertCreated();

        self::assertSame(0, BoxContribution::query()->count());
    }

    public function test_photos_are_checked_like_every_other_upload(): void
    {
        $box = BoxScenario::makeBox($this);

        $text = UploadedFile::fake()->createWithContent('trucje.jpg', 'dit is geen foto');
        BoxScenario::contribute($this, $box['token'], ['photo' => $text, 'value' => ''])->assertUnprocessable()->assertJsonValidationErrors('photo');

        $svg = UploadedFile::fake()->createWithContent('plaatje.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        BoxScenario::contribute($this, $box['token'], ['photo' => $svg, 'value' => ''])->assertUnprocessable();

        config(['printopoly.boxes.photo_max_megabytes' => 1]);
        $big = UploadedFile::fake()->create('groot.jpg', 2048, 'image/jpeg');
        BoxScenario::contribute($this, $box['token'], ['photo' => $big, 'value' => ''])->assertUnprocessable();

        self::assertSame(0, BoxContribution::query()->count());
        self::assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_a_closed_box_takes_nothing_more_and_an_expired_one_is_gone(): void
    {
        $box = BoxScenario::makeBox($this);
        BoxScenario::contribute($this, $box['token'])->assertCreated();

        $this->postJson('/api/boxes/' . $box['id'] . '/close', [], BoxScenario::owner($box['ownerSecret']))->assertOk()->assertJsonPath('status', 'closed');
        BoxScenario::contribute($this, $box['token'], ['value' => 'Nog een'])->assertConflict();
        $this->get('/nl/box/' . $box['token'])->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page->where('box.status', 'closed'));
        $this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner($box['ownerSecret']))->assertOk()->assertJsonCount(1, 'contributions');

        $this->travelTo(CarbonImmutable::now()->addDays(31));
        BoxScenario::contribute($this, $box['token'])->assertNotFound();
        $this->get('/nl/box/' . $box['token'])->assertNotFound();
        $this->getJson('/api/boxes/' . $box['id'], BoxScenario::owner($box['ownerSecret']))->assertNotFound();
    }

    public function test_the_box_is_full_after_the_configured_number_of_contributions_and_photos(): void
    {
        config(['printopoly.boxes.max_contributions' => 2, 'printopoly.boxes.max_photos' => 1]);
        $box = BoxScenario::makeBox($this);

        BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo()])->assertCreated();
        BoxScenario::contribute($this, $box['token'], ['photo' => BoxScenario::photo(), 'value' => ''])->assertConflict();
        BoxScenario::contribute($this, $box['token'])->assertCreated();
        BoxScenario::contribute($this, $box['token'])->assertConflict();

        self::assertSame(2, BoxContribution::query()->count());
    }

    public function test_adding_is_rate_limited_per_address(): void
    {
        $box = BoxScenario::makeBox($this);

        for ($i = 0; $i < 8; $i++) {
            BoxScenario::contribute($this, $box['token'], ['value' => 'Naam ' . $i])->assertCreated();
        }

        BoxScenario::contribute($this, $box['token'])->assertTooManyRequests();
    }

    public function test_making_boxes_without_an_account_is_limited_per_address_and_day(): void
    {
        config(['printopoly.boxes.per_ip_per_day' => 2]);

        BoxScenario::makeBox($this);
        BoxScenario::makeBox($this);
        $this->postJson('/api/boxes', ['editionId' => 'edition-0001', 'editionName' => 'X', 'snapshot' => []])->assertTooManyRequests();
    }
}
