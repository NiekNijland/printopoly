<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Actions\ImportEditions;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class ImportEditionsTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_each_edition_is_judged_on_its_own_and_reported_by_id(): void
    {
        config(['printopoly.limits.editions_per_account' => 3]);
        $user = User::factory()->create();
        Editions::store($user, 'bestaand', ['name' => 'Op de server']);

        $report = resolve(ImportEditions::class)->handle($user, [
            Editions::payload('nieuw'),
            Editions::payload('bestaand', ['name' => 'Uit de browser']),
            ['id' => 'kapot', 'name' => ''],
            'geen editie',
            ['name' => 'Zonder id'],
            Editions::payload('ook-nieuw'),
            Editions::payload('te-veel'),
        ]);

        self::assertSame(['nieuw', 'ook-nieuw'], $report['imported']);
        self::assertSame(['bestaand'], $report['conflicts']);
        self::assertSame(['te-veel'], $report['overLimit']);
        self::assertSame(['kapot', '#3', '#4'], array_keys($report['invalid']));
        self::assertNotSame([], $report['invalid']['kapot']);
        self::assertSame('Op de server', Edition::query()->where('edition_id', 'bestaand')->firstOrFail()->name);
        self::assertSame(3, Edition::query()->where('user_id', $user->publicId())->count());
    }

    public function test_nothing_to_import_is_an_empty_report(): void
    {
        $report = resolve(ImportEditions::class)->handle(User::factory()->create(), []);

        self::assertSame(['imported' => [], 'conflicts' => [], 'overLimit' => [], 'invalid' => []], $report);
    }
}
