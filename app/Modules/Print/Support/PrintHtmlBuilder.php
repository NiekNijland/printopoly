<?php

declare(strict_types=1);

namespace App\Modules\Print\Support;

use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\ValueObjects\ExpectedPdf;
use App\Modules\Print\ValueObjects\PrintEdition;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Str;

/**
 * The HTML for one part: a Blade view with the Vite entry resources/js/print.tsx
 * and the edition as inline JSON (B54). The page makes no requests except to
 * this app's own origin, which the CSP enforces (B69).
 */
final class PrintHtmlBuilder
{
    /**
     * @param array<string, string> $sources Placement key to the URL of its crop.
     */
    public function build(PrintPart $part, PrintSet $set, PrintEdition $edition, array $sources, ExpectedPdf $expected): string
    {
        $base = rtrim(Config::string('printopoly.print.render_base_url'), '/');
        $nonce = Str::random(32);

        // The page has no origin (Chrome gets HTML, not a URL), so its module scripts are fetched
        // across origins. The assets come through print-assets, which answers with CORS headers.
        Vite::createAssetPathsUsing(static fn (string $path): string => $base . '/print-assets/' . ltrim($path, '/'));
        Vite::useCspNonce($nonce);

        try {
            return view('print.render', [
                'locale' => $edition->locale()->value,
                'title' => trim($edition->name) === '' ? 'Printopoly' : $edition->name,
                'base' => $base,
                'nonce' => $nonce,
                'csp' => self::contentSecurityPolicy($base, $nonce),
                'width' => $this->mm($expected->widthMm),
                'height' => $this->mm($expected->heightMm),
                'payload' => [
                    'part' => $part->value,
                    'set' => $set->value,
                    'assetBase' => $base,
                    'pageShaveMm' => Config::float('printopoly.print.page_height_shave_mm'),
                    'edition' => $edition->toPrintPayload($sources),
                ],
            ])->render();
        } finally {
            Vite::createAssetPathsUsing(null);
        }
    }

    public static function contentSecurityPolicy(string $base, string $nonce): string
    {
        return sprintf('default-src \'none\'; script-src %1$s \'nonce-%2$s\'; style-src %1$s \'unsafe-inline\'; img-src %1$s data:; font-src %1$s data:', $base, $nonce);
    }

    private function mm(float $value): string
    {
        return rtrim(rtrim(number_format($value, 3, '.', ''), '0'), '.');
    }
}
