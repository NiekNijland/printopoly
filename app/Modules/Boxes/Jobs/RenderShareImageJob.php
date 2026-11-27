<?php

declare(strict_types=1);

namespace App\Modules\Boxes\Jobs;

use App\Modules\Boxes\Support\ShareImageRenderer;
use App\Modules\Boxes\Support\ShareImages;
use App\Modules\Print\Exceptions\PrintFailedException;
use App\Support\Queue;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Queue\InteractsWithQueue;
use Throwable;

/**
 * Renders the picture for "Deel je bord" (B77, B174, B228) on the `pdf` queue, where Chrome may run. The web server
 * has `proc_open` switched off, so a request only dispatches this job and the browser asks for the result. The job
 * carries the id only: the edition and its photos wait in the cache (`ShareImages`), so no photo sits in the queue
 * or in Horizon's list of recent jobs.
 */
#[Timeout(120)]
#[Tries(1)]
final class RenderShareImageJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;

    public function __construct(public readonly string $id)
    {
        $this->onQueue(Queue::PDF);
    }

    public function handle(ShareImageRenderer $renderer, ShareImages $images): void
    {
        try {
            $input = $images->takeInput($this->id) ?? throw new PrintFailedException('The input of the picture is gone.');
            $images->done($this->id, $renderer->render($renderer->clean($input['edition'], $input['photos'])));
        } catch (Throwable $throwable) {
            // The log has the cause; the browser gets a sentence.
            report($throwable);
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
