<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

/**
 * Keeps a limit on how many documents a group holds (the editions of an account, the contributions and photos of a
 * box) when two requests add at the same time. Each document takes a slot: a number below the limit that no other
 * document of the group holds. A unique index on the group and the slot field refuses the second document that
 * takes the same slot, and then the slots are read again. Counting first and inserting after cannot do this: both
 * requests count the same number.
 */
final readonly class QuotaSlots
{
    private const int DUPLICATE_KEY = 11000;

    private const int ATTEMPTS = 5;

    /**
     * The first quota that is full, without taking a slot: a refusal before costly work, such as storing a photo.
     *
     * @template TModel of Model
     *
     * @param array<string, array{Builder<TModel>, int}> $quotas per slot field: the documents of the group that count, and the limit
     * @return string|null the slot field of the first full quota
     */
    public function full(array $quotas): ?string
    {
        foreach ($quotas as $field => [$holders, $limit]) {
            if ($this->freeSlot($holders, $field, $limit) === null) {
                return $field;
            }
        }

        return null;
    }

    /**
     * Saves a document in a free slot of every quota.
     *
     * @template TModel of Model
     *
     * @param array<string, array{Builder<TModel>, int}> $quotas per slot field: the documents of the group that count, and the limit
     * @param Closure(array<string, int>): void $save saves the document with these slots
     * @return string|null the slot field of the quota that is full, or null when the document is saved
     *
     * @throws RuntimeException when the save fails on anything but a slot that another request took
     */
    public function claim(array $quotas, Closure $save): ?string
    {
        for ($attempt = 1; ; $attempt++) {
            $slots = [];

            foreach ($quotas as $field => [$holders, $limit]) {
                $slot = $this->freeSlot($holders, $field, $limit);

                if ($slot === null) {
                    return $field;
                }

                $slots[$field] = $slot;
            }

            try {
                $save($slots);

                return null;
            } catch (RuntimeException $runtimeException) {
                if ($runtimeException->getCode() !== self::DUPLICATE_KEY || $attempt >= self::ATTEMPTS || ! $this->anyTaken($quotas, $slots)) {
                    throw $runtimeException;
                }
            }
        }
    }

    /**
     * The lowest slot below the limit that no document of the group holds, read in one query; null when the group
     * holds the limit or more.
     *
     * @template TModel of Model
     *
     * @param Builder<TModel> $holders
     */
    private function freeSlot(Builder $holders, string $field, int $limit): ?int
    {
        $held = (clone $holders)->pluck($field)->all();

        if (count($held) >= $limit) {
            return null;
        }

        $taken = array_flip(array_filter($held, is_int(...)));

        $slot = 0;

        while (isset($taken[$slot])) {
            $slot++;
        }

        return $slot < $limit ? $slot : null;
    }

    /**
     * @template TModel of Model
     *
     * @param array<string, array{Builder<TModel>, int}> $quotas
     * @param array<string, int> $slots
     */
    private function anyTaken(array $quotas, array $slots): bool
    {
        foreach ($quotas as $field => [$holders]) {
            if ((clone $holders)->where($field, $slots[$field])->exists()) {
                return true;
            }
        }

        return false;
    }
}
