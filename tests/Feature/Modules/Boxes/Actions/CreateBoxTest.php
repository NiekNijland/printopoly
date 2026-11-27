<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Actions;

use App\Models\CollectionBox;
use App\Models\User;
use App\Modules\Boxes\Actions\CreateBox;
use App\Modules\Boxes\Support\BoxAccess;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class CreateBoxTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_new_box_stores_only_the_hash_of_the_owner_secret(): void
    {
        $made = resolve(CreateBox::class)->handle(null, 'e1', 'Zaterdagclub', 'xx', [], '10.0.0.1');

        self::assertIsString($made['secret']);
        self::assertSame(BoxAccess::hash($made['secret']), $made['box']->owner_hash);
        self::assertSame('nl', $made['box']->language);
        self::assertSame(CollectionBox::OPEN, $made['box']->status);
    }

    public function test_a_logged_in_owner_gets_the_box_they_already_have(): void
    {
        $user = User::factory()->createOne();
        $first = resolve(CreateBox::class)->handle($user, 'e1', 'Zaterdagclub', 'nl', [], '10.0.0.1');

        $second = resolve(CreateBox::class)->handle($user, 'e1', 'Zaterdagclub', 'nl', [], '10.0.0.1');

        self::assertNull($second['secret']);
        self::assertTrue($first['box']->is($second['box']));
        self::assertSame(1, CollectionBox::query()->count());
    }

    public function test_an_address_without_account_makes_a_limited_number_of_boxes_a_day(): void
    {
        config(['printopoly.boxes.per_ip_per_day' => 1]);
        resolve(CreateBox::class)->handle(null, 'e1', 'Zaterdagclub', 'nl', [], '10.0.0.1');

        $this->expectException(TooManyRequestsHttpException::class);

        resolve(CreateBox::class)->handle(null, 'e2', 'Zaterdagclub', 'nl', [], '10.0.0.1');
    }
}
