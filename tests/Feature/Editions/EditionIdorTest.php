<?php

declare(strict_types=1);

namespace Tests\Feature\Editions;

use App\Events\EditionDeleted;
use App\Events\EditionDuplicated;
use App\Models\Edition;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\Support\Editions;
use Tests\TestCase;

/**
 * Object-level authorization: the id of an edition is in the URL, so every
 * endpoint that takes one must prove that it belongs to the caller. Someone
 * else's edition answers 404, exactly like an id that does not exist.
 */
final class EditionIdorTest extends TestCase
{
    use RefreshesMongoDatabase;

    /**
     * @return iterable<string, array{string, string, array<string, mixed>}>
     */
    public static function endpoints(): iterable
    {
        yield 'show' => ['GET', '/api/editions/secret', []];
        yield 'patch' => ['PATCH', '/api/editions/secret', ['baseRevision' => 2, 'name' => 'Hacked']];
        yield 'replace' => ['PUT', '/api/editions/secret', ['baseRevision' => 2, 'id' => 'secret', 'name' => 'Hacked']];
        yield 'rename' => ['PATCH', '/api/editions/secret/name', ['baseRevision' => 2, 'name' => 'Hacked']];
        yield 'duplicate' => ['POST', '/api/editions/secret/duplicate', []];
        yield 'delete' => ['DELETE', '/api/editions/secret', []];
    }

    /**
     * @param array<string, mixed> $body
     */
    #[DataProvider('endpoints')]
    public function test_another_user_gets_a_404_and_nothing_changes(string $method, string $url, array $body): void
    {
        ['owner' => $owner, 'intruder' => $intruder] = $this->scenario();

        Event::fake([EditionDeleted::class, EditionDuplicated::class]);

        $response = $this->actingAs($intruder)->json($method, $url, $this->bodyFor($method, $body));

        $response->assertNotFound();
        self::assertStringNotContainsString('Owner only', (string) $response->getContent());

        $stored = Edition::query()->where('edition_id', 'secret')->firstOrFail();
        self::assertSame('Owner only', $stored->name);
        self::assertSame(2, $stored->revision);
        self::assertSame($owner->publicId(), $stored->user_id);
        self::assertSame(1, Edition::query()->count());
        Event::assertNothingDispatched();
    }

    /**
     * @param array<string, mixed> $body
     */
    #[DataProvider('endpoints')]
    public function test_the_404_is_the_same_as_for_an_edition_that_does_not_exist(string $method, string $url, array $body): void
    {
        ['intruder' => $intruder] = $this->scenario();

        $other = $this->actingAs($intruder)->json($method, $url, $this->bodyFor($method, $body))->status();
        $missing = $this->actingAs($intruder)->json($method, str_replace('secret', 'does-not-exist', $url), $this->bodyFor($method, $body))->status();

        self::assertSame($missing, $other);
    }

    public function test_the_list_never_contains_another_users_editions(): void
    {
        ['intruder' => $intruder] = $this->scenario();

        $this->actingAs($intruder)
            ->getJson('/api/editions')
            ->assertOk()
            ->assertJsonCount(0, 'editions');
    }

    public function test_creating_with_the_id_of_someone_elses_edition_makes_an_own_edition(): void
    {
        ['owner' => $owner, 'intruder' => $intruder] = $this->scenario();

        $this->actingAs($intruder)
            ->postJson('/api/editions', Editions::payload('secret', ['name' => 'Mine']))
            ->assertCreated()
            ->assertJsonPath('edition.name', 'Mine');

        self::assertSame('Owner only', Edition::query()->where('user_id', $owner->publicId())->firstOrFail()->name);
        $this->actingAs($intruder)->getJson('/api/editions/secret')->assertJsonPath('edition.name', 'Mine');
        $this->actingAs($owner)->getJson('/api/editions/secret')->assertJsonPath('edition.name', 'Owner only');
    }

    public function test_importing_the_id_of_someone_elses_edition_does_not_touch_it(): void
    {
        ['owner' => $owner, 'intruder' => $intruder] = $this->scenario();

        $this->actingAs($intruder)
            ->postJson('/api/editions/import', ['editions' => [Editions::payload('secret', ['name' => 'Mine'])]])
            ->assertOk()
            ->assertJsonPath('imported', ['secret'])
            ->assertJsonPath('conflicts', []);

        self::assertSame('Owner only', Edition::query()->where('user_id', $owner->publicId())->firstOrFail()->name);
    }

    public function test_the_owner_still_reaches_the_edition(): void
    {
        ['owner' => $owner] = $this->scenario();

        $this->actingAs($owner)->getJson('/api/editions/secret')->assertOk()->assertJsonPath('edition.name', 'Owner only');
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function bodyFor(string $method, array $body): array
    {
        return $method === 'PUT' ? Editions::payload('secret', $body) : $body;
    }

    /**
     * @return array{owner: User, intruder: User}
     */
    private function scenario(): array
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        Editions::store($owner, 'secret', ['name' => 'Owner only', 'revision' => 2]);

        return ['owner' => $owner, 'intruder' => $intruder];
    }
}
