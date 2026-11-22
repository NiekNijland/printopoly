<?php

declare(strict_types=1);

namespace App\Print;

use Illuminate\Support\Facades\Cache;

/**
 * Where a picture for "Deel je bord" waits between the request, the job and the browser (B174, B228). One entry per
 * request, under an unguessable id, in the cache: waiting, done with the PNG, or failed. The edition and its photos
 * wait next to it for the job only, so the queue payload stays small, and the job removes them as soon as it starts.
 * Everything is gone after a quarter of an hour, so nothing is kept for long and no cleanup is needed.
 *
 * @phpstan-import-type ShareInput from ShareImageRenderer
 */
final class ShareImages
{
    private const int TTL_SECONDS = 900;

    /**
     * @param ShareInput $input
     */
    public function waiting(string $id, array $input): void
    {
        Cache::put($this->key($id), ['status' => 'waiting'], self::TTL_SECONDS);
        Cache::put($this->inputKey($id), $input, self::TTL_SECONDS);
    }

    /**
     * The edition and photos of a request, once: after this they are gone from the cache.
     *
     * @return ShareInput|null
     */
    public function takeInput(string $id): ?array
    {
        $input = Cache::pull($this->inputKey($id));

        /** @var ShareInput|null */
        return is_array($input) && is_array($input['edition'] ?? null) && is_array($input['photos'] ?? null) ? $input : null;
    }

    public function done(string $id, string $png): void
    {
        Cache::put($this->key($id), ['status' => 'done', 'png' => base64_encode($png)], self::TTL_SECONDS);
    }

    public function failed(string $id): void
    {
        Cache::forget($this->inputKey($id));
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

    private function inputKey(string $id): string
    {
        return 'share-image-input:' . $id;
    }
}
