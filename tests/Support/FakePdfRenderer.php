<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Enums\PrintPart;
use App\Enums\PrintSet;
use App\Print\PdfRenderer;
use App\Print\PrintEditionData;
use App\Print\PrintLayout;
use Override;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

/**
 * Stands in for Chrome. It reads the part and set from the print page, works
 * out what the page plan says and writes a blank PDF of exactly that, unless a
 * test asks for something wrong.
 */
final class FakePdfRenderer implements PdfRenderer
{
    /** @var list<string> */
    public array $htmls = [];

    public int $calls = 0;

    /** 'ok', 'wrong_size', 'wrong_count', 'crash' or 'timeout' */
    public string $mode = 'ok';

    public function __construct(private readonly PrintEditionData $edition)
    {
    }

    #[Override]
    public function render(string $html, float $widthMm, float $heightMm, bool $waitForReady): string
    {
        $this->calls++;
        $this->htmls[] = $html;

        if ($this->mode === 'timeout') {
            throw new ProcessTimedOutException(Process::fromShellCommandline('sleep 1'), ProcessTimedOutException::TYPE_GENERAL);
        }

        if ($this->mode === 'crash') {
            throw new RuntimeException('Chrome crashed.');
        }

        $width = $widthMm;
        $height = $heightMm;
        $pages = 1;

        if ($waitForReady) {
            if (preg_match('/data-part="([a-z_]+)" data-set="([a-z]+)"/', $html, $match) !== 1) {
                throw new RuntimeException('The print page has no part and set.');
            }

            $part = PrintPart::from($match[1]);
            $expected = PrintLayout::expect($part, PrintSet::from($match[2]), $this->edition->onlyFor($part));
            $pages = $expected->pages ?? 1;
        }

        if ($this->mode === 'wrong_size') {
            $width *= 1.05;
        }

        if ($this->mode === 'wrong_count') {
            $pages++;
        }

        return TestPdf::make(TestPdf::pages($pages, $width, $height));
    }
}
