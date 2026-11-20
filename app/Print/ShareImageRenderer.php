<?php

declare(strict_types=1);

namespace App\Print;

use App\Boxes\BoxTargets;
use App\Enums\Locale;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Str;

/**
 * The picture for the group app (B77, B128): the board with its names, 1080 by 1080 pixels, rendered by the same
 * Chrome and the same print page as the PDF's. Chrome makes a one-page PDF of the board, and `pdftoppm` (from
 * poppler-utils, which the PDF check already needs) turns that page into a PNG. Nothing is stored: the bytes go
 * to whoever asked. No photos are drawn, so there is nothing to upload and nothing private in the picture.
 */
final readonly class ShareImageRenderer
{
    public const int PIXELS = 1080;

    /** The page is 1080 CSS pixels (96 per inch) wide and high. */
    private const float PAGE_MM = 1080 / 96 * 25.4;

    public function __construct(private PdfRenderer $renderer)
    {
    }

    /**
     * @param array<mixed> $edition The edition as the browser holds it; only theme, language, currency, board profile
     *                              and the names of the spaces and the board centre are used.
     *
     * @throws PrintFailed
     */
    public function render(array $edition): string
    {
        $locale = Locale::tryFrom(is_string($edition['language'] ?? null) ? $edition['language'] : '') ?? Locale::default();
        $html = $this->html($edition, $locale);
        $pdf = $this->renderer->render($html, self::PAGE_MM, self::PAGE_MM, true);

        return $this->rasterize($pdf);
    }

    /**
     * @param array<mixed> $edition
     */
    private function html(array $edition, Locale $locale): string
    {
        $base = rtrim(config()->string('printopoly.print.render_base_url'), '/');
        $nonce = Str::random(32);

        Vite::createAssetPathsUsing(static fn (string $path): string => $base . '/print-assets/' . ltrim($path, '/'));
        Vite::useCspNonce($nonce);

        $mm = rtrim(rtrim(number_format(self::PAGE_MM, 3, '.', ''), '0'), '.');

        try {
            return view('print.render', [
                'locale' => $locale->value,
                'base' => $base,
                'nonce' => $nonce,
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
                        'kicker' => __('boxes.share_kicker', [], $locale->value),
                        'footer' => 'printopoly.nl',
                    ],
                    'edition' => $this->payloadEdition($edition, $locale),
                ],
            ])->render();
        } finally {
            Vite::createAssetPathsUsing(null);
        }
    }

    /**
     * @param array<mixed> $edition
     * @return array<string, mixed>
     */
    private function payloadEdition(array $edition, Locale $locale): array
    {
        $elements = [];
        $given = is_array($edition['elements'] ?? null) ? $edition['elements'] : [];

        foreach ($given as $key => $element) {
            $key = (string) $key;
            $name = is_array($element) ? ($element['name'] ?? null) : null;

            if (is_string($name) && ($key === 'board_center' || preg_match('/^space\.\d{2}$/', $key) === 1)) {
                $name = mb_substr(BoxTargets::tidy($name), 0, 120);

                if ($name !== '') {
                    $elements[$key] = ['name' => $name];
                }
            }
        }

        $profile = is_array($edition['boardProfile'] ?? null) ? $edition['boardProfile'] : null;
        $outer = is_array($profile) && is_numeric($profile['outer'] ?? null) ? (float) $profile['outer'] : 0.0;

        return [
            'name' => mb_substr(BoxTargets::tidy(is_string($edition['name'] ?? null) ? $edition['name'] : ''), 0, 120),
            'language' => $locale->value,
            'theme' => is_string($edition['theme'] ?? null) && in_array($edition['theme'], ['classic', 'riso', 'strak'], true) ? $edition['theme'] : 'classic',
            'currency' => is_string($edition['currency'] ?? null) && preg_match('/^[a-z]{2,8}$/', $edition['currency']) === 1 ? $edition['currency'] : null,
            'boardProfile' => $outer >= 150 && $outer <= 800 ? $profile : null,
            'parts' => (object) [],
            'elements' => (object) $elements,
        ];
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
