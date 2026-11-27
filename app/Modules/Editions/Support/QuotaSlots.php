<?php

declare(strict_types=1);

namespace App\Modules\Editions\Support;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Throwable;

/**
 * A limit per group that holds under parallel requests: a document takes the lowest free slot below the limit, and a
 * unique index on the group and the slot refuses a slot taken twice (docs/guards/queries.md, `quota-slot`).
 */
final readonly class QuotaSlots
{
    private const int DUPLICATE_KEY = 11000;

    private const int ATTEMPTS = 5;

    /**
     * @template TModel of Model
     *
     * @param array<string, array{Builder<TModel>, int}> $quotas per slot field: the documents of the group that count, and the limit
     * @return string|null the slot field of the first full quota, read without taking a slot (a refusal before costly work)
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
     * @template TModel of Model
     *
     * @param array<string, array{Builder<TModel>, int}> $quotas per slot field: the documents of the group that count, and the limit
     * @param Closure(array<string, int>): void $save saves the document with these slots
     * @return string|null the slot field of the quota that is full, or null when the document is saved
     *
     * @throws Throwable when the save fails on anything but a slot that another request took
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

            $failure = rescue(static function () use ($save, $slots): null {
                $save($slots);

                return null;
            }, static fn (Throwable $throwable): Throwable => $throwable, report: false);

            if ($failure === null) {
                return null;
            }

            $lostSlot = $failure->getCode() === self::DUPLICATE_KEY && $attempt < self::ATTEMPTS && $this->anyTaken($quotas, $slots);

            throw_unless($lostSlot, $failure);
        }
    }

    /**
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
