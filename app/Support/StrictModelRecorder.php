<?php

declare(strict_types=1);

namespace App\Support;

use Throwable;

/**
 * Records a violation of the strict models instead of throwing it (decision Q-06): the error tracker gets the exception, and
 * in a test run its keys go to the file of the test worker. tests/ModelStrictness/ModelStrictnessUnionTest.php compares the
 * union of those files with its counted list.
 */
final readonly class StrictModelRecorder
{
    /**
     * @param string|null $log the file of this test worker; null outside a test run
     */
    public function __construct(
        private ?string $log,
    ) {
    }

    /**
     * Makes the file of this worker, so the union check tells a run without violations from a run in which nothing recorded.
     */
    public function start(): void
    {
        if ($this->log === null || is_file($this->log)) {
            return;
        }

        if (! is_dir(dirname($this->log))) {
            mkdir(dirname($this->log), 0o755, true);
        }

        touch($this->log);
    }

    /**
     * @param list<string> $keys one per violation: model, kind, and the relation or attribute
     */
    public function record(Throwable $exception, array $keys): void
    {
        report($exception);

        if ($this->log !== null && $keys !== []) {
            file_put_contents($this->log, implode("\n", $keys) . "\n", FILE_APPEND | LOCK_EX);
        }
    }
}
