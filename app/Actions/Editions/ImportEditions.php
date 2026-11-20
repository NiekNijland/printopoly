<?php

declare(strict_types=1);

namespace App\Actions\Editions;

use App\Edition\EditionConflict;
use App\Edition\EditionLimitReached;
use App\Edition\EditionValidator;
use App\Models\User;

/**
 * The after-login import (B81): the local editions the user chose to keep in
 * the account. Each edition is judged on its own and the answer lists them by
 * id. Nothing existing is overwritten, an edition over the limit stays local,
 * and an invalid edition is reported with its messages.
 */
final readonly class ImportEditions
{
    public function __construct(
        private EditionValidator $validator,
        private StoreEdition $store,
    ) {
    }

    /**
     * @param list<mixed> $editions
     * @return array{imported: list<string>, conflicts: list<string>, overLimit: list<string>, invalid: array<string, list<string>>}
     */
    public function handle(User $user, array $editions): array
    {
        $report = ['imported' => [], 'conflicts' => [], 'overLimit' => [], 'invalid' => []];

        foreach ($editions as $index => $raw) {
            $errors = [];
            $parsed = $this->validator->tryEdition($raw, $errors);

            if ($parsed === null) {
                $id = is_array($raw) && is_string($raw['id'] ?? null) ? $raw['id'] : "#{$index}";
                $report['invalid'][$id] = $errors;

                continue;
            }

            try {
                $this->store->handle($user, $parsed);
                $report['imported'][] = $parsed['id'];
            } catch (EditionConflict) {
                $report['conflicts'][] = $parsed['id'];
            } catch (EditionLimitReached) {
                $report['overLimit'][] = $parsed['id'];
            }
        }

        return $report;
    }
}
