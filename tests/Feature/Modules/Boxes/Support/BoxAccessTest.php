<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Support;

use App\Models\CollectionBox;
use App\Models\User;
use App\Modules\Boxes\Support\BoxAccess;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class BoxAccessTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_the_owner_secret_in_the_header_opens_the_box(): void
    {
        $box = CollectionBox::factory()->createOne(['owner_hash' => BoxAccess::hash('molenweg-geheim')]);

        $found = resolve(BoxAccess::class)->owned($this->request('molenweg-geheim'), $box->publicId());

        self::assertSame($box->publicId(), $found->publicId());
        self::assertSame(hash('sha256', 'molenweg-geheim'), BoxAccess::hash('molenweg-geheim'));
    }

    public function test_a_wrong_or_empty_secret_does_not_open_the_box(): void
    {
        $box = CollectionBox::factory()->createOne(['owner_hash' => BoxAccess::hash('molenweg-geheim')]);
        $access = resolve(BoxAccess::class);

        self::assertNull($access->ownedBox($this->request('kerkstraat'), $box->publicId()));
        self::assertNull($access->ownedBox($this->request(''), $box->publicId()));
        self::assertNull($access->ownedBox($this->request(null), $box->publicId()));
    }

    public function test_the_account_that_made_the_box_opens_it_without_a_secret(): void
    {
        $user = User::factory()->createOne();
        $other = User::factory()->createOne();
        $box = CollectionBox::factory()->createOne(['user_id' => $user->publicId()]);
        $anonymous = CollectionBox::factory()->createOne();
        $access = resolve(BoxAccess::class);

        self::assertTrue($access->owns($this->request(null, $user), $box));
        self::assertFalse($access->owns($this->request(null, $other), $box));
        self::assertFalse($access->owns($this->request(null, $user), $anonymous));
    }

    public function test_an_expired_unknown_or_malformed_box_does_not_exist(): void
    {
        $expired = CollectionBox::factory()->createOne([
            'owner_hash' => BoxAccess::hash('molenweg-geheim'),
            'expires_at' => now()->subMinute()->toImmutable(),
        ]);
        $access = resolve(BoxAccess::class);
        $request = $this->request('molenweg-geheim');

        self::assertNull($access->ownedBox($request, $expired->publicId()));
        self::assertNull($access->ownedBox($request, 'aaaaaaaaaaaaaaaaaaaaaaaa'));
        self::assertNull($access->ownedBox($request, 'molenweg'));

        $this->expectException(NotFoundHttpException::class);
        $access->owned($request, $expired->publicId());
    }

    public function test_a_live_link_opens_the_box_for_friends_until_it_expires(): void
    {
        $box = CollectionBox::factory()->createOne(['token' => 'box-token-molen']);
        CollectionBox::factory()->createOne(['token' => 'box-token-oud', 'expires_at' => now()->subMinute()->toImmutable()]);
        $access = resolve(BoxAccess::class);

        self::assertSame($box->publicId(), $access->liveByLink('box-token-molen')->publicId());
        self::assertTrue($access->linkOpens('box-token-molen'));
        self::assertNull($access->byLink('box-token-oud'));
        self::assertFalse($access->linkOpens('box-token-oud'));
        self::assertFalse($access->linkOpens('box-token-onbekend'));

        $this->expectException(NotFoundHttpException::class);
        $access->liveByLink('box-token-oud');
    }

    public function test_a_replaced_link_still_finds_its_box_while_it_lives(): void
    {
        $box = CollectionBox::factory()->createOne(['replaced_tokens' => [CollectionBox::tokenHash('box-token-vorig')]]);
        CollectionBox::factory()->createOne([
            'replaced_tokens' => [CollectionBox::tokenHash('box-token-verlopen')],
            'expires_at' => now()->subMinute()->toImmutable(),
        ]);
        $access = resolve(BoxAccess::class);

        self::assertSame($box->publicId(), $access->replacedLinkOrFail('box-token-vorig')->publicId());
        self::assertTrue($access->linkOpens('box-token-vorig'));
        self::assertNull($access->byLink('box-token-vorig'));
        self::assertNull($access->replacedLink('box-token-verlopen'));

        $this->expectException(NotFoundHttpException::class);
        $access->replacedLinkOrFail('box-token-verlopen');
    }

    private function request(?string $secret, ?User $user = null): Request
    {
        $request = Request::create('/api/boxes', 'GET', server: $secret === null ? [] : ['HTTP_X_BOX_OWNER' => $secret]);
        $request->setUserResolver(static fn (): ?User => $user);

        return $request;
    }
}
