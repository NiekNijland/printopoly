<?php

declare(strict_types=1);

namespace App\Integrations\Chrome;

use HeadlessChromium\Exception\OperationTimedOut;
use HeadlessChromium\Page;
use Illuminate\Support\Sleep;
use Override;
use Spatie\LaravelPdf\Drivers\ChromeDriver;
use Spatie\LaravelPdf\PdfOptions;

/**
 * The Chrome driver of spatie/laravel-pdf, but it keeps asking whether the page is ready while the page is busy.
 * The package asks with the default answer time of chrome-php (5 seconds) and fails the PDF when the page does not
 * answer in time. A big render, such as the money of three sets (B242), keeps the page busy longer than that while
 * other parts render next to it; the question then waits for the page up to the ready timeout instead.
 */
final class PatientChromeDriver extends ChromeDriver
{
    #[Override]
    protected function waitForReadiness(Page $page, PdfOptions $options): void
    {
        $this->waitUntilReady($page, $options);
    }

    public function waitUntilReady(Page $page, PdfOptions $options): void
    {
        if ($options->waitForReady === null) {
            return;
        }

        $timeout = $options->waitForReadyTimeout ?? 30000;
        $deadline = microtime(true) + ($timeout / 1000);
        $expression = "(() => { try { return Boolean({$options->waitForReady}); } catch (error) { return false; } })()";

        do {
            $left = max(1000, (int) (($deadline - microtime(true)) * 1000));

            try {
                $evaluation = $page->evaluate($expression);
                // waitForResponse() is the call that throws OperationTimedOut; getReturnValue() then reads the answer it holds.
                $evaluation->waitForResponse($left);

                if ((bool) $evaluation->getReturnValue()) {
                    return;
                }
            } catch (OperationTimedOut) {
                // The page did not answer within the time that was left: it is still not ready.
                return;
            }

            Sleep::usleep(100_000);
        } while (microtime(true) < $deadline);
    }
}
