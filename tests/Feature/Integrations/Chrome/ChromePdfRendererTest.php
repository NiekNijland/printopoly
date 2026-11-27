<?php

declare(strict_types=1);

namespace Tests\Feature\Integrations\Chrome;

use App\Integrations\Chrome\ChromePdfRenderer;
use Spatie\LaravelPdf\Facades\Pdf;
use Spatie\LaravelPdf\Support\DummyPdf;
use Tests\TestCase;

final class ChromePdfRendererTest extends TestCase
{
    public function test_an_a4_page_is_asked_a_fifth_of_a_point_under_its_whole_points_without_margins(): void
    {
        $pdf = Pdf::fake();

        $bytes = resolve(ChromePdfRenderer::class)->render('<p>Molenweg</p>', 210.0, 297.0, false);

        self::assertSame(DummyPdf::content(), $bytes);
        self::assertSame('<p>Molenweg</p>', $pdf->html);
        self::assertSame(['width' => (595 - 0.2) / 72, 'height' => (842 - 0.2) / 72, 'unit' => 'in'], $pdf->paperSize);
        self::assertSame(['top' => 0.0, 'right' => 0.0, 'bottom' => 0.0, 'left' => 0.0, 'unit' => 'mm'], $pdf->margins);
        self::assertNull($pdf->waitForReady);
        self::assertNull($pdf->waitForReadyTimeout);
    }

    public function test_a_size_between_two_points_is_asked_at_the_nearest_whole_point(): void
    {
        $pdf = Pdf::fake();

        resolve(ChromePdfRenderer::class)->render('<p>Kaart</p>', 69.0, 94.0, false);

        self::assertSame(['width' => (196 - 0.2) / 72, 'height' => (266 - 0.2) / 72, 'unit' => 'in'], $pdf->paperSize);
    }

    public function test_a_print_page_waits_until_it_says_it_is_ready_within_the_configured_time(): void
    {
        config(['printopoly.print.ready_timeout_ms' => 45000]);
        $pdf = Pdf::fake();

        resolve(ChromePdfRenderer::class)->render('<div data-part="board"></div>', 500.0, 500.0, true);

        self::assertSame('window.printReady === true', $pdf->waitForReady);
        self::assertSame(45000, $pdf->waitForReadyTimeout);
    }
}
