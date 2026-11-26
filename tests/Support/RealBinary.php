<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Process\FakeProcessResult;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Process\Process as SystemProcess;

/**
 * A test that needs a real binary (the integration tier, poppler-utils) names it; the run is real and still recorded.
 */
final class RealBinary
{
    public static function allow(string ...$binaries): void
    {
        foreach ($binaries as $binary) {
            Process::fake(["'" . $binary . "' *" => self::run(...)]);
        }
    }

    private static function run(PendingProcess $pending): FakeProcessResult
    {
        $command = $pending->command;
        $process = is_array($command) ? new SystemProcess($command, $pending->path) : SystemProcess::fromShellCommandline((string) $command, $pending->path);
        $process->setTimeout($pending->timeout);
        $process->run();

        return Process::result($process->getOutput(), $process->getErrorOutput(), $process->getExitCode() ?? 1);
    }
}
