<?php

declare(strict_types=1);

namespace Tests\Unit\Print;

use App\Print\PatientChromeDriver;
use HeadlessChromium\Exception\OperationTimedOut;
use HeadlessChromium\Page;
use HeadlessChromium\PageUtils\PageEvaluation;
use PHPUnit\Framework\Attributes\Test;
use ReflectionMethod;
use Spatie\LaravelPdf\PdfOptions;
use Tests\TestCase;

/**
 * The money of three sets keeps the render page busy for more than 5 seconds while other parts render next to it.
 * The ready check must wait for the page up to the ready timeout, not fail after chrome-php's default 5 seconds.
 */
final class PatientChromeDriverTest extends TestCase
{
    #[Test]
    public function the_ready_check_waits_for_a_busy_page_up_to_the_ready_timeout(): void
    {
        $evaluation = $this->createMock(PageEvaluation::class);
        $evaluation->expects($this->once())
            ->method('getReturnValue')
            ->with($this->greaterThan(60_000))
            ->willReturn(true);
        $page = $this->createMock(Page::class);
        $page->method('evaluate')->willReturn($evaluation);

        $this->waitFor($page, 120_000);
    }

    #[Test]
    public function a_page_that_never_answers_leaves_the_pdf_check_to_catch_it(): void
    {
        $evaluation = $this->createMock(PageEvaluation::class);
        $evaluation->method('getReturnValue')->willThrowException(new OperationTimedOut('Operation timed out after 1s.'));
        $page = $this->createMock(Page::class);
        $page->expects($this->once())->method('evaluate')->willReturn($evaluation);

        $this->waitFor($page, 1);
    }

    private function waitFor(Page $page, int $timeout): void
    {
        $options = new PdfOptions();
        $options->waitForReady = 'window.printReady === true';
        $options->waitForReadyTimeout = $timeout;

        new ReflectionMethod(PatientChromeDriver::class, 'waitForReadiness')
            ->invoke(new PatientChromeDriver(), $page, $options);
    }
}
