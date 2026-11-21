<?php

declare(strict_types=1);

namespace Tests\Feature\Boxes;

use App\Jobs\RenderShareImageJob;
use App\Print\PdfRenderer;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Override;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Response;
use Tests\Support\RecordingPdfRenderer;
use Tests\TestCase;

/**
 * "Plaatje voor de groepsapp" (B77): the print page of Chrome, one page, turned into a 1080 px PNG by pdftoppm.
 * Chrome runs in a job on the queue and the browser asks for the result (B174). The tests run the queue in sync, so
 * the picture is there at once.
 */
final class ShareImageTest extends TestCase
{
    private RecordingPdfRenderer $renderer;

    #[Override]
    protected function setUp(): void
    {
        parent::setUp();

        $this->renderer = new RecordingPdfRenderer();
        $this->app->instance(PdfRenderer::class, $this->renderer);
    }

    /**
     * @return array<string, mixed>
     */
    private function edition(): array
    {
        return [
            'name' => 'Zaterdagclub',
            'language' => 'nl',
            'theme' => 'riso',
            'currency' => 'eur',
            'boardProfile' => ['id' => 'modern-square', 'name' => 'Modern vierkant', 'outer' => 500, 'corner' => 70, 'border' => 0, 'panels' => 4, 'boxLid' => ['w' => 267, 'h' => 267]],
            'elements' => [
                'space.01' => ['name' => 'Molenweg', 'photo' => ['photoId' => 'geheim-1', 'cx' => 0.5, 'cy' => 0.5, 'scale' => 1, 'rotation' => 0, 'grayscale' => false]],
                'board_center' => ['name' => 'Zaterdagclub'],
                'card.chance.01' => ['text' => 'Niet voor het plaatje'],
                'words.bank' => ['name' => 'Bank van Raalte'],
            ],
        ];
    }

    /**
     * @param array<mixed> $edition
     * @return TestResponse<Response>
     */
    private function make(array $edition): TestResponse
    {
        $id = $this->postJson('/api/share-image', ['edition' => $edition])->assertAccepted()->json('id');
        self::assertIsString($id);

        return $this->get('/api/share-image/' . $id);
    }

    #[Test]
    public function the_request_only_puts_a_job_on_the_queue_and_never_starts_a_process(): void
    {
        // Production PHP-FPM has proc_open switched off: nothing in the web request may start Chrome or pdftoppm.
        Queue::fake();
        Process::preventStrayProcesses();

        $response = $this->postJson('/api/share-image', ['edition' => $this->edition()]);

        $response->assertAccepted()->assertJsonPath('status', 'waiting');
        $id = $response->json('id');
        self::assertIsString($id);
        self::assertSame([], $this->renderer->calls);
        Queue::assertPushedOn('pdf', RenderShareImageJob::class);
        Queue::assertPushed(RenderShareImageJob::class, fn (RenderShareImageJob $job): bool => $job->id === $id
            && ! str_contains((string) json_encode($job->edition), 'geheim-1'));

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
    public function only_names_and_looks_reach_the_page_never_photos_or_other_text(): void
    {
        $this->make($this->edition())->assertOk();

        $html = $this->renderer->calls[0][0];

        self::assertStringContainsString('Molenweg', $html);
        self::assertStringContainsString('riso', $html);
        self::assertStringContainsString(__('boxes.share_kicker', [], 'nl'), $html);
        self::assertStringNotContainsString('geheim-1', $html, 'no photo placement');
        self::assertStringNotContainsString('Niet voor het plaatje', $html, 'no card text');
        self::assertStringNotContainsString('Bank van Raalte', $html);
    }

    #[Test]
    public function the_kicker_follows_the_language_of_the_edition(): void
    {
        $this->make([...$this->edition(), 'language' => 'en'])->assertOk();

        self::assertStringContainsString(__('boxes.share_kicker', [], 'en'), $this->renderer->calls[0][0]);
    }

    #[Test]
    public function a_board_profile_that_is_not_sensible_is_not_used(): void
    {
        $edition = $this->edition();
        $edition['boardProfile'] = ['id' => 'x', 'outer' => 90000];

        $this->make($edition)->assertOk();

        self::assertStringContainsString('boardProfile\u0022:null', $this->renderer->calls[0][0]);
    }

    #[Test]
    public function an_edition_is_required(): void
    {
        $this->postJson('/api/share-image', [])->assertUnprocessable();
        $this->postJson('/api/share-image', ['edition' => 'tekst'])->assertUnprocessable();
        self::assertSame([], $this->renderer->calls);
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
