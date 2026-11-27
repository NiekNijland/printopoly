<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Actions;

use App\Models\CollectionBox;
use App\Modules\Boxes\Actions\RenewBoxLink;
use Tests\Concerns\RefreshesMongoDatabase;
use Tests\TestCase;

final class RenewBoxLinkTest extends TestCase
{
    use RefreshesMongoDatabase;

    public function test_a_new_link_opens_the_box_again_and_remembers_the_old_one(): void
    {
        config(['printopoly.boxes.retention_days' => 12]);
        $box = CollectionBox::factory()->createOne(['token' => 'box-token-old', 'status' => CollectionBox::CLOSED]);

        resolve(RenewBoxLink::class)->handle($box);

        $stored = $box->refresh();
        self::assertNotSame('box-token-old', $stored->token);
        self::assertSame(CollectionBox::OPEN, $stored->status);
        self::assertSame([CollectionBox::tokenHash('box-token-old')], $stored->replaced_tokens);
        self::assertSame(now()->addDays(12)->getTimestamp(), $stored->expires_at->getTimestamp());
    }

    public function test_the_box_remembers_only_the_latest_links(): void
    {
        $box = CollectionBox::factory()->createOne(['replaced_tokens' => array_map(static fn (int $n): string => 'hash-' . $n, range(1, CollectionBox::REMEMBERED_TOKENS))]);

        resolve(RenewBoxLink::class)->handle($box);

        $remembered = $box->refresh()->replaced_tokens ?? [];
        self::assertCount(CollectionBox::REMEMBERED_TOKENS, $remembered);
        self::assertNotContains('hash-' . CollectionBox::REMEMBERED_TOKENS, $remembered);
    }
}
