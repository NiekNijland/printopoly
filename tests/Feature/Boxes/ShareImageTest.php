<?php

declare(strict_types=1);

namespace Tests\Feature\Boxes;

use App\Jobs\RenderShareImageJob;
use App\Print\PdfRenderer;
use App\Print\ShareImageRenderer;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Response;
use Tests\Concerns\MakesEditions;
use Tests\Support\RecordingPdfRenderer;
use Tests\Support\TestImages;
use Tests\TestCase;

/**
 * "Deel je bord" (B77, B228): the board as it is, with its photos and own words, drawn by the print page of Chrome on
 * one page and turned into a 1080 px PNG by pdftoppm. Chrome runs in a job on the queue and the browser asks for the
 * result (B174). The tests run the queue in sync, so the picture is there at once.
 */
final class ShareImageTest extends TestCase
{
    use MakesEditions;

    private RecordingPdfRenderer $renderer;

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $this->renderer = new RecordingPdfRenderer();
        $this->app->instance(PdfRenderer::class, $this->renderer);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function edition(array $overrides = []): array
    {
        return $this->editionPayload('e1', [
            'theme' => 'riso',
            'elements' => [
                'space.01' => ['name' => 'Molenweg', 'photo' => $this->placement('molen')],
                'board_center' => ['name' => 'Lisa en Thomas', 'photo' => $this->placement('stel')],
                'card.chance.01' => ['photo' => $this->placement('kaart')],
                'words.chest' => ['name' => 'Huwelijkskas'],
            ],
            ...$overrides,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function placement(string $id): array
    {
        return ['photoId' => $id, 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false];
    }

    /**
     * @return array{id: string, src: string, width: int, height: int}
     */
    private function photo(string $id, string $type = 'jpeg'): array
    {
        $bytes = $type === 'png' ? TestImages::png(40, 30) : TestImages::jpeg(40, 30);

        return ['id' => $id, 'src' => 'data:image/' . $type . ';base64,' . base64_encode($bytes), 'width' => 40, 'height' => 30];
    }

    /**
     * @param array<mixed> $edition
     * @param list<array<string, mixed>> $photos
     * @return TestResponse<Response>
     */
    private function make(array $edition, array $photos = []): TestResponse
    {
        $id = $this->postJson('/api/share-image', ['edition' => $edition, 'photos' => $photos])->assertAccepted()->json('id');
        self::assertIsString($id);

        return $this->get('/api/share-image/' . $id);
    }

    #[Test]
    public function the_request_only_puts_a_job_on_the_queue_and_never_starts_a_process(): void
    {
        // Production PHP-FPM has proc_open switched off: nothing in the web request may start Chrome or pdftoppm.
        Queue::fake();
        Process::preventStrayProcesses();

        $response = $this->postJson('/api/share-image', ['edition' => $this->edition(), 'photos' => [$this->photo('molen')]]);

        $response->assertAccepted()->assertJsonPath('status', 'waiting');
        $id = $response->json('id');
        self::assertIsString($id);
        self::assertSame([], $this->renderer->calls);
        Queue::assertPushedOn('pdf', RenderShareImageJob::class);
        // The job carries the id only: no photo sits in the queue or in Horizon.
        Queue::assertPushed(RenderShareImageJob::class, fn (RenderShareImageJob $job): bool => $job->id === $id
            && ! str_contains(serialize($job), 'base64'));

        $this->getJson('/api/share-image/' . $id)->assertAccepted()->assertJsonPath('status', 'waiting');
    }

    #[Test]
    public function an_unknown_picture_is_not_there(): void
    {
        $this->getJson('/api/share-image/' . str_repeat('a', 40))->assertNotFound();
    }

    #[Test]
    public function it_makes_a_png_of_1080_pixels_without_an_account(): void
    {
        $response = $this->make($this->edition());

        $response->assertOk()->assertHeader('Content-Type', 'image/png');
        $size = getimagesizefromstring((string) $response->getContent());

        self::assertIsArray($size);
        self::assertSame(1080, $size[0]);
        self::assertSame(1080, $size[1]);
        self::assertSame(IMAGETYPE_PNG, $size[2]);
    }

    #[Test]
    public function the_page_is_a_square_of_1080_css_pixels_and_chrome_waits_for_it(): void
    {
        $this->make($this->edition())->assertOk();

        [$html, $width, $height, $waits] = $this->renderer->calls[0];

        self::assertEqualsWithDelta(285.75, $width, 0.001);
        self::assertEqualsWithDelta(285.75, $height, 0.001);
        self::assertTrue($waits);
        self::assertStringContainsString('data-part="share"', $html);
        self::assertStringContainsString('@page { size: 285.75mm 285.75mm', $html);
    }

    #[Test]
    public function the_page_gets_the_real_board_its_own_words_and_the_photos_on_it(): void
    {
        // R5-24: the picture showed the standard board without photos.
        $this->make($this->edition(), [$this->photo('molen'), $this->photo('stel', 'png')])->assertOk();

        $html = $this->renderer->calls[0][0];

        self::assertStringContainsString('Molenweg', $html);
        self::assertStringContainsString('Lisa en Thomas', $html);
        self::assertStringContainsString('Huwelijkskas', $html);
        self::assertStringContainsString('riso', $html);
        // The payload is JSON inside a script, so its slashes are escaped.
        $plain = str_replace('\\', '', $html);
        self::assertStringContainsString('data:image/jpeg;base64,' . base64_encode(TestImages::jpeg(40, 30)), $plain);
        self::assertStringContainsString('data:image/png;base64,' . base64_encode(TestImages::png(40, 30)), $plain);
    }

    #[Test]
    public function the_kicker_says_it_is_our_own_edition_not_the_old_call_of_make_it_together(): void
    {
        $this->make($this->edition())->assertOk();
        $this->make($this->edition(['language' => 'en']))->assertOk();

        self::assertStringContainsString('Onze eigen editie', $this->renderer->calls[0][0]);
        self::assertStringContainsString('Our own edition', $this->renderer->calls[1][0]);
        self::assertStringNotContainsString('Bedenk mee', $this->renderer->calls[0][0]);
    }

    #[Test]
    public function a_photo_that_is_not_what_it_says_or_not_on_the_edition_is_left_out(): void
    {
        $fake = ['id' => 'molen', 'src' => 'data:image/jpeg;base64,' . base64_encode('geen foto'), 'width' => 40, 'height' => 30];
        $png = ['id' => 'stel', 'src' => 'data:image/jpeg;base64,' . base64_encode(TestImages::png(40, 30)), 'width' => 40, 'height' => 30];
        $svg = ['id' => 'molen', 'src' => 'data:image/svg+xml;base64,' . base64_encode('<svg/>'), 'width' => 40, 'height' => 30];
        $elsewhere = $this->photo('vreemd');

        $this->make($this->edition(), [$fake, $png, $svg, $elsewhere])->assertOk();

        $html = $this->renderer->calls[0][0];
        self::assertStringNotContainsString('base64,', $html);
        self::assertStringNotContainsString('vreemd', $html);
    }

    #[Test]
    public function the_photos_together_stay_under_the_limit(): void
    {
        $renderer = $this->app->make(ShareImageRenderer::class);
        $photos = array_map(fn (int $i): array => $this->photo('p' . $i), range(1, ShareImageRenderer::MAX_PHOTOS + 5));
        $elements = [];
        foreach (range(1, ShareImageRenderer::MAX_PHOTOS + 5) as $i) {
            $elements['space.' . str_pad((string) (($i % 39) + 1), 2, '0', STR_PAD_LEFT)] = ['photo' => $this->placement('p' . $i)];
        }

        $clean = $renderer->clean($this->edition(['elements' => $elements]), $photos);

        self::assertLessThanOrEqual(ShareImageRenderer::MAX_PHOTOS, count($clean['photos']));
    }

    #[Test]
    public function an_edition_is_required_and_checked_like_a_saved_one(): void
    {
        $this->postJson('/api/share-image', [])->assertUnprocessable();
        $this->postJson('/api/share-image', ['edition' => 'tekst'])->assertUnprocessable();
        $this->postJson('/api/share-image', ['edition' => $this->edition(['theme' => 'neon'])])->assertUnprocessable();
        $this->postJson('/api/share-image', ['edition' => $this->edition(['elements' => ['geen.sleutel' => ['name' => 'x']]])])->assertUnprocessable();
        self::assertSame([], $this->renderer->calls);
    }

    #[Test]
    public function the_input_is_gone_from_the_cache_once_the_picture_is_made(): void
    {
        $id = $this->postJson('/api/share-image', ['edition' => $this->edition(), 'photos' => [$this->photo('molen')]])->json('id');
        self::assertIsString($id);

        self::assertNull(cache()->get('share-image-input:' . $id));
        $this->get('/api/share-image/' . $id)->assertOk()->assertHeader('Content-Type', 'image/png');
    }

    #[Test]
    public function a_chrome_that_fails_gives_a_sentence_and_no_stack_trace(): void
    {
        $this->renderer->crash = true;

        $this->make($this->edition())
            ->assertOk()
            ->assertJsonPath('status', 'failed')
            ->assertJsonPath('message', __('boxes.share_image_failed'));
    }

    #[Test]
    public function every_picture_is_a_chrome_run_so_it_is_limited_per_address(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->make($this->edition())->assertOk();
        }

        $this->postJson('/api/share-image', ['edition' => $this->edition()])->assertTooManyRequests();
    }
}
