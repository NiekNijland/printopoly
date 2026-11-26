<?php

declare(strict_types=1);

namespace Tests\Support\Architecture;

use Closure;
use Symfony\Component\Process\Process;

/**
 * Point 6 of the CI contract (04-guards.md C4), the half no pipeline reader holds: `.git-blame-ignore-revs` exists, and every hash
 * in it is a full commit hash reachable from HEAD, so `git blame` skips the whole-tree format and refactor commits and a hash
 * from a rewritten branch cannot linger. The checks jobs clone the full history (fetch-depth 0), so the reachability is
 * decidable there.
 */
final readonly class BlameIgnoreGuard
{
    public function __construct(
        private string $root,
        private string $file,
    ) {
    }

    /**
     * @return list<string>
     */
    public function violations(): array
    {
        if (! is_file($this->root . '/' . $this->file)) {
            return ['no ' . $this->file . ' in the repository: list the whole-tree format and refactor commits in it (one full hash per line), so git blame skips them'];
        }

        return $this->inFile((string) file_get_contents($this->root . '/' . $this->file), $this->reachable(...));
    }

    /**
     * @param Closure(string): bool $reachable whether a commit hash is reachable from HEAD
     * @return list<string>
     */
    public function inFile(string $text, Closure $reachable): array
    {
        $violations = [];
        $hashes = 0;

        foreach (explode("\n", $text) as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $hashes++;

            if (preg_match('/^[0-9a-f]{40}$/', $line) !== 1) {
                $violations[] = $this->file . ' holds `' . $line . '`, which is no full commit hash: write the 40-character hash';
            } elseif (! $reachable($line)) {
                $violations[] = $this->file . ' names ' . $line . ', which is no commit reachable from HEAD: a rewritten or lost commit. Replace it with the hash on the branch';
            }
        }

        if ($hashes === 0) {
            $violations[] = $this->file . ' lists no commit: add the hash of each whole-tree format and refactor commit';
        }

        return $violations;
    }

    private function reachable(string $hash): bool
    {
        return new Process(['git', '-C', $this->root, 'merge-base', '--is-ancestor', $hash, 'HEAD'])->run() === 0;
    }
}
