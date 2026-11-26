<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Support;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Support\EditionPayload;
use stdClass;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

final class EditionPayloadTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_stored_edition_leaves_in_the_shape_of_the_browser_with_its_elements_repaired(): void
    {
        $edition = Editions::store(User::factory()->create(), 'e1', ['template' => 'village', 'moneyAmount' => 'eight', 'printSelection' => ['set' => 'printer', 'parts' => ['cards']]]);
        Edition::query()->where('_id', $edition->getKey())->update(['elements' => ['bank' => ['name' => 'Pot'], 'space.02' => ['text' => 'x']]]);

        $payload = resolve(EditionPayload::class)->from(Edition::query()->where('_id', $edition->getKey())->firstOrFail());

        self::assertSame(['words.bank' => ['name' => 'Pot']], $payload['elements']);
        self::assertSame('village', $payload['template']);
        self::assertSame('eight', $payload['moneyAmount']);
        self::assertSame(['set' => 'printer', 'parts' => ['board', 'cards']], $payload['printSelection']);
        self::assertSame(['schemaVersion', 'id', 'name', 'language', 'currency', 'theme', 'boardProfile', 'parts', 'elements', 'revision', 'createdAt', 'updatedAt', 'template', 'moneyAmount', 'printSelection'], array_keys($payload));
    }

    public function test_an_edition_without_elements_or_choices_leaves_an_object_and_no_choices(): void
    {
        $edition = Editions::store(User::factory()->create(), 'e1');

        $payload = resolve(EditionPayload::class)->from($edition);

        self::assertInstanceOf(stdClass::class, $payload['elements']);
        self::assertArrayNotHasKey('template', $payload);
        self::assertArrayNotHasKey('moneyAmount', $payload);
        self::assertArrayNotHasKey('printSelection', $payload);
    }

    public function test_the_stored_keys_move_and_an_empty_array_becomes_an_object(): void
    {
        self::assertSame(['words.bank' => ['name' => 'Pot']], EditionPayload::migrated(['bank' => ['name' => 'Pot']]));
        self::assertSame([], get_object_vars($this->object(EditionPayload::asObject([]))));
        self::assertSame(['a' => 1], EditionPayload::asObject(['a' => 1]));
    }

    private function object(mixed $value): stdClass
    {
        self::assertInstanceOf(stdClass::class, $value);

        return $value;
    }
}
