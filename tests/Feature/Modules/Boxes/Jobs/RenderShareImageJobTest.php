<?php

declare(strict_types=1);

namespace Tests\Feature\Modules\Boxes\Jobs;

use App\Integrations\Chrome\Contracts\PdfRenderer;
use App\Modules\Boxes\Jobs\RenderShareImageJob;
use App\Modules\Boxes\Support\ShareImageRenderer;
use App\Modules\Boxes\Support\ShareImages;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Support\Queue;
use Illuminate\Support\Facades\Exceptions;
use RuntimeException;
use Tests\Support\Editions;
use Tests\Support\RealBinary;
use Tests\Support\RecordingPdfRenderer;
use Tests\TestCase;

final class RenderShareImageJobTest extends TestCase
{
    public function test_it_renders_the_waiting_picture_on_the_pdf_queue(): void
    {
        $renderer = new RecordingPdfRenderer();
        app()->instance(PdfRenderer::class, $renderer);
        RealBinary::allow('pdftoppm');
        $images = resolve(ShareImages::class);
        $images->waiting('bord-1', resolve(ShareImageRenderer::class)->clean(Editions::payload('e1')));

        $job = new RenderShareImageJob('bord-1');

        $job->handle(resolve(ShareImageRenderer::class), $images);

        $found = $images->find('bord-1');
        self::assertSame(Queue::PDF->value, $job->queue);
        self::assertCount(1, $renderer->calls);
        self::assertIsArray($found);
        self::assertSame('done', $found['status']);
        self::assertArrayHasKey('png', $found);
        self::assertStringStartsWith("\x89PNG", $found['png']);
        self::assertNull($images->takeInput('bord-1'));
    }

    public function test_a_picture_whose_input_is_gone_fails_and_is_reported(): void
    {
        Exceptions::fake([PrintFailedException::class]);
        $renderer = new RecordingPdfRenderer();
        app()->instance(PdfRenderer::class, $renderer);
        $images = resolve(ShareImages::class);

        new RenderShareImageJob('bord-weg')->handle(resolve(ShareImageRenderer::class), $images);

        self::assertSame(['status' => 'failed'], $images->find('bord-weg'));
        self::assertSame([], $renderer->calls);
        Exceptions::assertReported(PrintFailedException::class);
    }

    public function test_a_chrome_that_crashes_leaves_a_failed_picture(): void
    {
        Exceptions::fake([RuntimeException::class]);
        $renderer = new RecordingPdfRenderer();
        $renderer->crash = true;

        app()->instance(PdfRenderer::class, $renderer);
        $images = resolve(ShareImages::class);
        $images->waiting('bord-2', resolve(ShareImageRenderer::class)->clean(Editions::payload('e1')));

        new RenderShareImageJob('bord-2')->handle(resolve(ShareImageRenderer::class), $images);

        self::assertSame(['status' => 'failed'], $images->find('bord-2'));
        Exceptions::assertReported(static fn (RuntimeException $exception): bool => $exception->getMessage() === 'Chrome crashed.');
    }

    public function test_a_worker_that_dies_marks_the_picture_failed(): void
    {
        $images = resolve(ShareImages::class);
        $images->waiting('bord-3', resolve(ShareImageRenderer::class)->clean(Editions::payload('e1')));

        new RenderShareImageJob('bord-3')->failed(new RuntimeException('Timed out.'));

        self::assertSame(['status' => 'failed'], $images->find('bord-3'));
        self::assertNull($images->takeInput('bord-3'));
    }
}
