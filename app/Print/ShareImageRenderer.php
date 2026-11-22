<?php

declare(strict_types=1);

namespace App\Print;

use App\Edition\EditionValidator;
use App\Enums\Locale;
use ErrorException;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * "Deel je bord" (B77, B128, B228): the board as it is, 1080 by 1080 pixels, rendered by the same Chrome and the same
 * print page as the PDF's. The browser sends the edition and small copies of the photos on the board; the page draws
 * the board with its names, words, colours and photos. Chrome makes a one-page PDF of it, and `pdftoppm` (from
 * poppler-utils, which the PDF check already needs) turns that page into a PNG. Nothing is stored: the input waits in
 * the cache for the job only (`ShareImages`), and the bytes go to whoever asked.
 *
 * Chrome runs on the queue, never in a web request (B174): the controller keeps only `clean()`, the job renders.
 *
 * @phpstan-import-type EditionInput from EditionValidator
 *
 * @phpstan-type SharePhoto array{id: string, src: string, width: int, height: int}
 * @phpstan-type ShareInput array{edition: EditionInput, photos: list<SharePhoto>}
 */
final readonly class ShareImageRenderer
{
    public const int PIXELS = 1080;

    /** At most this many photos: every space, the centre with its background, and a few layers. */
    public const int MAX_PHOTOS = 60;

    /** One photo, decoded. The browser sends it at most 1400 px on the long side. */
    public const int MAX_PHOTO_BYTES = 1_500_000;

    /** All photos together, decoded. */
    public const int MAX_TOTAL_BYTES = 16_000_000;

    /** The page is 1080 CSS pixels (96 per inch) wide and high. */
    private const float PAGE_MM = 1080 / 96 * 25.4;

    public function __construct(private PdfRenderer $renderer, private EditionValidator $validator)
    {
    }

    /**
     * @param ShareInput $input What `clean()` made of the request.
     *
     * @throws PrintFailed
     */
    public function render(array $input): string
    {
        $locale = Locale::tryFrom($input['edition']['language']) ?? Locale::default();
        $html = $this->html($input, $locale);
        $pdf = $this->renderer->render($html, self::PAGE_MM, self::PAGE_MM, true);

        return $this->rasterize($pdf);
    }

    /**
     * The edition checked by the same rules as a saved one (`EditionValidator`), and the photos that are what they
     * say: a JPEG or PNG data URL under the limits, with an id the edition uses. A photo that is not is left out, and
     * its place on the board stays without a photo.
     *
     * @param array<mixed> $edition
     * @param array<mixed> $photos
     * @return ShareInput
     *
     * @throws ValidationException
     */
    public function clean(array $edition, array $photos = []): array
    {
        $valid = $this->validator->edition($edition);
        $used = $this->photoIds($valid['elements']);
        $kept = [];
        $total = 0;

        foreach (array_slice(array_values($photos), 0, self::MAX_PHOTOS) as $photo) {
            $clean = is_array($photo) ? $this->photo($photo) : null;

            if ($clean === null || ! isset($used[$clean[0]['id']]) || $total + $clean[1] > self::MAX_TOTAL_BYTES) {
                continue;
            }

            $total += $clean[1];
            $kept[] = $clean[0];
            unset($used[$clean[0]['id']]);
        }

        return ['edition' => $valid, 'photos' => $kept];
    }

    /**
     * @param ShareInput $input
     */
    private function html(array $input, Locale $locale): string
    {
        $base = rtrim(config()->string('printopoly.print.render_base_url'), '/');
        $nonce = Str::random(32);

        Vite::createAssetPathsUsing(static fn (string $path): string => $base . '/print-assets/' . ltrim($path, '/'));
        Vite::useCspNonce($nonce);

        $mm = rtrim(rtrim(number_format(self::PAGE_MM, 3, '.', ''), '0'), '.');
        $edition = $input['edition'];

        try {
            return view('print.render', [
                'locale' => $locale->value,
                'base' => $base,
                'nonce' => $nonce,
                // The photos come along as data: URLs, so nothing is loaded from outside the app.
                'csp' => sprintf(
                    "default-src 'none'; script-src %s 'nonce-%s'; style-src %s 'unsafe-inline'; img-src %s data:; font-src %s data:",
                    $base,
                    $nonce,
                    $base,
                    $base,
                    $base,
                ),
                'width' => $mm,
                'height' => $mm,
                'payload' => [
                    'part' => 'share',
                    'set' => 'printer',
                    'assetBase' => $base,
                    'pageShaveMm' => config()->float('printopoly.print.page_height_shave_mm'),
                    'labels' => [
                        'kicker' => __('editor.share_board_kicker', [], $locale->value),
                        'footer' => 'printopoly.nl',
                    ],
                    'edition' => [...$edition, 'elements' => (object) $edition['elements']],
                    'photos' => $input['photos'],
                ],
            ])->render();
        } finally {
            Vite::createAssetPathsUsing(null);
        }
    }

    /**
     * @param array<mixed> $photo
     * @return array{0: SharePhoto, 1: int}|null The photo and its size in bytes.
     */
    private function photo(array $photo): ?array
    {
        $id = $photo['id'] ?? null;
        $src = $photo['src'] ?? null;

        if (! is_string($id) || preg_match('/^[A-Za-z0-9_-]{1,128}$/', $id) !== 1 || ! is_string($src)) {
            return null;
        }

        if (preg_match('#^data:image/(jpeg|png);base64,([A-Za-z0-9+/=]+)$#', $src, $match) !== 1 || strlen($match[2]) > intdiv(self::MAX_PHOTO_BYTES * 4, 3) + 4) {
            return null;
        }

        $bytes = base64_decode($match[2], true);

        if (! is_string($bytes) || $bytes === '') {
            return null;
        }

        try {
            $size = getimagesizefromstring($bytes);
        } catch (ErrorException) {
            // Not an image at all: PHP warns, and Laravel makes that an exception.
            return null;
        }

        if ($size === false || $size[2] !== ($match[1] === 'png' ? IMAGETYPE_PNG : IMAGETYPE_JPEG) || $size[0] < 1 || $size[1] < 1) {
            return null;
        }

        return [['id' => $id, 'src' => $src, 'width' => $size[0], 'height' => $size[1]], strlen($bytes)];
    }

    /**
     * Every photo id the edition places somewhere: a photo, a background, an icon or a layer.
     *
     * @param array<string, array<string, mixed>> $elements
     * @return array<string, true>
     */
    private function photoIds(array $elements): array
    {
        $ids = [];
        $walk = static function (mixed $value) use (&$walk, &$ids): void {
            if (! is_array($value)) {
                return;
            }

            if (is_string($value['photoId'] ?? null)) {
                $ids[$value['photoId']] = true;
            }

            foreach ($value as $child) {
                $walk($child);
            }
        };
        $walk($elements);

        return $ids;
    }

    /**
     * @throws PrintFailed
     */
    private function rasterize(string $pdf): string
    {
        $base = tempnam(sys_get_temp_dir(), 'printopoly-share-');

        if ($base === false) {
            throw new PrintFailed('No temporary file for the picture.');
        }

        $pdfPath = $base . '.pdf';
        $pngBase = $base . '-page';

        try {
            file_put_contents($pdfPath, $pdf);

            $result = Process::timeout(60)->run(['pdftoppm', '-png', '-singlefile', '-f', '1', '-l', '1', '-scale-to', (string) self::PIXELS, $pdfPath, $pngBase]);

            $png = $result->successful() && is_file($pngBase . '.png') ? file_get_contents($pngBase . '.png') : false;

            if (! is_string($png) || $png === '') {
                throw new PrintFailed('pdftoppm could not make the picture: ' . trim($result->errorOutput()));
            }

            return $png;
        } finally {
            @unlink($base);
            @unlink($pdfPath);
            @unlink($pngBase . '.png');
        }
    }
}
