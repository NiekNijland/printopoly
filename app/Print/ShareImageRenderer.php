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
 *
 * Chrome runs on the queue, never in a web request (B174): the controller keeps only `clean()`, the job renders.
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
     * @param array<mixed> $edition The edition as the browser holds it, or as `clean()` left it.
     *
     * @throws PrintFailed
     */
    public function render(array $edition): string
    {
        $clean = $this->clean($edition);
        $locale = Locale::tryFrom($clean['language']) ?? Locale::default();
        $html = $this->html($clean, $locale);
        $pdf = $this->renderer->render($html, self::PAGE_MM, self::PAGE_MM, true);

        return $this->rasterize($pdf);
    }

    /**
     * @param array{name: string, language: string, theme: string, currency: string|null, boardProfile: array<mixed>|null, elements: array<string, array{name: string}>} $edition
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
                    'edition' => [...$edition, 'parts' => (object) [], 'elements' => (object) $edition['elements']],
                ],
            ])->render();
        } finally {
            Vite::createAssetPathsUsing(null);
        }
    }

    /**
     * Only theme, language, currency, board profile and the names of the spaces and the board centre are kept; the
     * rest of what the browser sent is dropped. Safe to call twice.
     *
     * @param array<mixed> $edition
     * @return array{name: string, language: string, theme: string, currency: string|null, boardProfile: array<mixed>|null, elements: array<string, array{name: string}>}
     */
    public function clean(array $edition): array
    {
        $locale = Locale::tryFrom(is_string($edition['language'] ?? null) ? $edition['language'] : '') ?? Locale::default();
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

        return [
            'name' => mb_substr(BoxTargets::tidy(is_string($edition['name'] ?? null) ? $edition['name'] : ''), 0, 120),
            'language' => $locale->value,
            'theme' => is_string($edition['theme'] ?? null) && in_array($edition['theme'], ['classic', 'riso', 'strak'], true) ? $edition['theme'] : 'classic',
            'currency' => is_string($edition['currency'] ?? null) && preg_match('/^[a-z]{2,8}$/', $edition['currency']) === 1 ? $edition['currency'] : null,
            'boardProfile' => $this->profile($edition['boardProfile'] ?? null),
            'elements' => $elements,
        ];
    }

    /**
     * A board profile with every field the renderers need. What the browser left out comes from the standard
     * profile (a missing corner grows with the board), so a profile with only `outer` still draws its spaces.
     * Null, and so the standard board, when the outer size is not sensible or the spaces do not fit.
     *
     * @return array{id: string, name: string, outer: float, corner: float, border: float, panels: int, boxLid: array{w: float, h: float}}|null
     */
    private function profile(mixed $given): ?array
    {
        if (! is_array($given) || ! is_numeric($given['outer'] ?? null)) {
            return null;
        }

        $outer = (float) $given['outer'];

        if ($outer < 150 || $outer > 800) {
            return null;
        }

        $standardOuter = config()->float('printopoly.print.profile.outer');
        $positive = static fn (mixed $value, float $fallback): float => is_numeric($value) && (float) $value > 0 ? (float) $value : $fallback;
        $lid = is_array($given['boxLid'] ?? null) ? $given['boxLid'] : [];
        $corner = $positive($given['corner'] ?? null, config()->float('printopoly.print.profile.corner') * $outer / $standardOuter);
        $border = is_numeric($given['border'] ?? null) && (float) $given['border'] >= 0 ? (float) $given['border'] : 0.0;
        $inner = $outer - 2 * $border;

        // The same rule as the editor: two corners and nine spaces of at least 15 mm.
        if (2 * $corner + 9 * 15 > $inner) {
            return null;
        }

        $id = is_string($given['id'] ?? null) && preg_match('/^[a-z0-9-]{1,64}$/', $given['id']) === 1 ? $given['id'] : config()->string('printopoly.print.profile.id');

        return [
            'id' => $id,
            'name' => is_string($given['name'] ?? null) ? mb_substr(BoxTargets::tidy($given['name']), 0, 120) : '',
            'outer' => $outer,
            'corner' => $corner,
            'border' => $border,
            'panels' => ($given['panels'] ?? 4) === 2 ? 2 : 4,
            'boxLid' => [
                'w' => $positive($lid['w'] ?? null, config()->float('printopoly.print.profile.box_lid.w')),
                'h' => $positive($lid['h'] ?? null, config()->float('printopoly.print.profile.box_lid.h')),
            ],
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
