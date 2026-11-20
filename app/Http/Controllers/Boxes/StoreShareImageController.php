<?php

declare(strict_types=1);

namespace App\Http\Controllers\Boxes;

use App\Http\Controllers\Controller;
use App\Print\ShareImageRenderer;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * "Plaatje voor de groepsapp" (B77, B128): a PNG of the board with its names, 1080 pixels, to send along with the
 * link. The browser sends the names of its edition, the answer is the picture and nothing is kept. It needs no
 * account and is throttled per address, because every picture is a Chrome run.
 */
final class StoreShareImageController extends Controller
{
    public function __invoke(Request $request, ShareImageRenderer $renderer): Response
    {
        $request->validate([
            'edition' => ['required', 'array'],
        ]);

        $edition = $request->array('edition');

        try {
            $png = $renderer->render($edition);
        } catch (Throwable $failed) {
            // Chrome or pdftoppm failed: the person gets a sentence, the log gets the cause.
            report($failed);

            throw ValidationException::withMessages(['edition' => __('boxes.share_image_failed')])->status(500);
        }

        $name = is_string($edition['name'] ?? null) ? Str::slug($edition['name']) : '';

        return response($png, 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'inline; filename="' . ($name === '' ? 'printopoly' : $name) . '-groepsapp.png"',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
