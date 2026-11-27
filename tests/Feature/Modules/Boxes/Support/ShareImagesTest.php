<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Support;

use App\Modules\Boxes\Support\ShareImageRenderer;
use App\Modules\Boxes\Support\ShareImages;
use Illuminate\Support\Facades\Cache;
use Tests\Support\Editions;
use Tests\TestCase;

/**
 * @phpstan-import-type ShareInput from ShareImageRenderer
 */
final class ShareImagesTest extends TestCase
{
    public function test_a_new_request_waits_and_its_input_can_be_taken_once(): void
    {
        $images = resolve(ShareImages::class);
        $input = $this->input();

        $images->waiting('verzoek-1', $input);

        self::assertSame(['status' => 'waiting'], $images->find('verzoek-1'));
        self::assertSame($input, $images->takeInput('verzoek-1'));
        self::assertNull($images->takeInput('verzoek-1'));
    }

    public function test_a_done_picture_gives_back_its_bytes(): void
    {
        $images = resolve(ShareImages::class);

        $images->done('verzoek-2', "\x89PNG bord");

        self::assertSame(['status' => 'done', 'png' => "\x89PNG bord"], $images->find('verzoek-2'));
    }

    public function test_a_failed_picture_is_failed_and_its_input_is_gone(): void
    {
        $images = resolve(ShareImages::class);
        $images->waiting('verzoek-3', $this->input());

        $images->failed('verzoek-3');

        self::assertSame(['status' => 'failed'], $images->find('verzoek-3'));
        self::assertNull($images->takeInput('verzoek-3'));
    }

    public function test_an_unknown_or_expired_id_is_not_there(): void
    {
        $images = resolve(ShareImages::class);
        $images->done('verzoek-4', 'bord');

        $this->travel(901)->seconds();

        self::assertNull($images->find('verzoek-4'));
        self::assertNull($images->find('onbekend'));
    }

    public function test_a_broken_entry_in_the_cache_reads_as_failed_or_not_there(): void
    {
        $images = resolve(ShareImages::class);
        Cache::put('share-image:kapot', ['status' => 'done', 'png' => '***'], 60);
        Cache::put('share-image:vreemd', ['status' => 'bezig'], 60);
        Cache::put('share-image:leeg', 'tekst', 60);
        Cache::put('share-image-input:half', ['edition' => [], 'photos' => 'geen'], 60);

        self::assertSame(['status' => 'failed'], $images->find('kapot'));
        self::assertSame(['status' => 'failed'], $images->find('vreemd'));
        self::assertNull($images->find('leeg'));
        self::assertNull($images->takeInput('half'));
    }

    /**
     * @return ShareInput
     */
    private function input(): array
    {
        return resolve(ShareImageRenderer::class)->clean(Editions::payload('e1', ['name' => 'Molenweg']));
    }
}
