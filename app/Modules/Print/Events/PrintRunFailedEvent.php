<?php

declare(strict_types=1);

namespace App\Modules\Print\Events;

/**
 * The worker of a print run died or timed out (GeneratePrintJob::failed); MarkFailedPrintRun handles it synchronously.
 */
final readonly class PrintRunFailedEvent
{
    /**
     * @param list<array{string, string}> $targets Pairs of set and part values of the run.
     */
    public function __construct(public string $printJobId, public array $targets)
    {
    }
}
