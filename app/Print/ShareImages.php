<?php

declare(strict_types=1);

namespace App\Print;

use Illuminate\Support\Facades\Cache;

/**
 * Where a picture for the group app waits between the job and the browser (B174). One entry per request, under an
 * unguessable id, in the cache: waiting, done with the PNG, or failed. It is gone after a quarter of an hour, so
 * nothing is kept for long and no cleanup is needed.
 */
final class ShareImages
{
    private const int TTL_SECONDS = 900;

    public function waiting(string $id): void
    {
        Cache::put($this->key($id), ['status' => 'waiting'], self::TTL_SECONDS);
    }

    public function done(string $id, string $png): void
    {
        Cache::put($this->key($id), ['status' => 'done', 'png' => base64_encode($png)], self::TTL_SECONDS);
    }

    public function failed(string $id): void
    {
        Cache::put($this->key($id), ['status' => 'failed'], self::TTL_SECONDS);
    }

    /**
     * @return array{status: 'waiting'|'failed'}|array{status: 'done', png: string}|null Null for an unknown or expired id.
     */
    public function find(string $id): ?array
    {
        $entry = Cache::get($this->key($id));

        if (! is_array($entry) || ! is_string($entry['status'] ?? null)) {
            return null;
        }

        if ($entry['status'] === 'done' && is_string($entry['png'] ?? null)) {
            $png = base64_decode($entry['png'], true);

            return is_string($png) ? ['status' => 'done', 'png' => $png] : ['status' => 'failed'];
        }

        return ['status' => $entry['status'] === 'waiting' ? 'waiting' : 'failed'];
    }

    private function key(string $id): string
    {
        return 'share-image:' . $id;
    }
}
