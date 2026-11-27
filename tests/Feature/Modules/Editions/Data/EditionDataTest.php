<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Editions\Data;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Support\EditionPayload;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class EditionDataTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_an_edition_without_its_optional_fields_leaves_as_the_browser_type_holds_it(): void
    {
        $edition = Edition::factory()->createOne(['elements' => [], 'template' => null, 'money_amount' => null, 'print_selection' => null]);

        self::assertSame(json_encode(resolve(EditionPayload::class)->from($edition), JSON_THROW_ON_ERROR), json_encode(resolve(EditionPayload::class)->data($edition), JSON_THROW_ON_ERROR));
        self::assertStringContainsString('"elements":{}', json_encode(resolve(EditionPayload::class)->data($edition), JSON_THROW_ON_ERROR));
    }

    public function test_an_edition_with_its_optional_fields_keeps_every_key_in_the_same_order(): void
    {
        $edition = Edition::factory()->createOne(['template' => 'kerst', 'money_amount' => 'ruim', 'print_selection' => ['set' => 'home', 'parts' => ['board']]]);

        self::assertSame(json_encode(resolve(EditionPayload::class)->from($edition), JSON_THROW_ON_ERROR), json_encode(resolve(EditionPayload::class)->data($edition), JSON_THROW_ON_ERROR));
        self::assertSame(['schemaVersion', 'id', 'name', 'language', 'currency', 'theme', 'boardProfile', 'parts', 'elements', 'revision', 'createdAt', 'updatedAt', 'template', 'moneyAmount', 'printSelection'], array_keys(resolve(EditionPayload::class)->data($edition)->toArray()));
    }

    public function test_the_endpoint_wraps_it_under_edition(): void
    {
        $user = User::factory()->createOne();
        $edition = Edition::factory()->createOne(['user_id' => $user->publicId()]);
        $this->actingAs($user);

        $this->getJson('/api/editions/' . $edition->edition_id)->assertOk()->assertExactJson(['edition' => json_decode(json_encode(resolve(EditionPayload::class)->from($edition), JSON_THROW_ON_ERROR), true)]);
    }
}
