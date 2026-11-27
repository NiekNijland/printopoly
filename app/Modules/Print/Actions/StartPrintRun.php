<?php

declare(strict_types=1);

namespace App\Modules\Print\Actions;

use App\Models\PrintJob;
use App\Modules\Content\Enums\Locale;
use App\Modules\Print\Enums\PrintPart;
use App\Modules\Print\Enums\PrintSet;
use App\Modules\Print\Support\PrintChoiceInput;
use App\Modules\Print\Support\PrintRunStarter;

/**
 * "Drukkerij-set maken" or a single part (B95). Only the chosen parts are made (B99). The language of the site and the
 * choices of the set travel with the run while nothing runs (B156, B184).
 */
final readonly class StartPrintRun
{
    public function __construct(private PrintRunStarter $starter)
    {
    }

    /**
     * @param list<PrintPart> $parts
     * @param array<mixed>|null $choices
     * @param array<string, array<string, array{w: float, h: float}>>|null $targets
     */
    public function handle(PrintJob $printJob, PrintSet $set, array $parts, ?Locale $site, ?array $choices, ?array $targets): void
    {
        if ($site instanceof Locale && $site->value !== $printJob->locale && ! $printJob->isBusy()) {
            $printJob->locale = $site->value;
            $printJob->save();
        }

        if ($choices !== null && ! $printJob->isBusy()) {
            $printJob->rememberChoice($set, PrintChoiceInput::merge($choices, $printJob->choiceFor($set)));
        }

        $this->starter->start($printJob, $set, $parts, $targets);
    }
}
