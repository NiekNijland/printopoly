<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Print\ShareImageRenderer;
use App\Print\ShareImages;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Throwable;

/**
 * Renders the picture for the group app (B77, B174) on the `pdf` queue, where Chrome may run. The web server has
 * `proc_open` switched off, so a request only dispatches this job and the browser asks for the result.
 */
final class RenderShareImageJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;

    public int $tries = 1;

    public int $timeout = 120;

    /**
     * @param array<mixed> $edition What `ShareImageRenderer::clean()` kept of the edition.
     */
    public function __construct(
        public readonly string $id,
        public readonly array $edition,
    ) {
        $this->onQueue('pdf');
    }

    public function handle(ShareImageRenderer $renderer, ShareImages $images): void
    {
        try {
            $images->done($this->id, $renderer->render($this->edition));
        } catch (Throwable $failed) {
            // The log has the cause; the browser gets a sentence.
            report($failed);
            $images->failed($this->id);
        }
    }

    /**
     * The worker died or timed out: the browser must not wait for ever.
     */
    public function failed(Throwable $exception): void
    {
        unset($exception);
        resolve(ShareImages::class)->failed($this->id);
    }
}
