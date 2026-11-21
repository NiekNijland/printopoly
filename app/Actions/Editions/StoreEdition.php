<?php

declare(strict_types=1);

namespace App\Actions\Editions;

use App\Edition\EditionConflict;
use App\Edition\EditionLimitReached;
use App\Edition\EditionPayload;
use App\Edition\EditionValidator;
use App\Models\Edition;
use App\Models\User;

/**
 * Puts a new edition in an account, with the id, revision and times the
 * browser gave it, so the local copy and the account copy stay comparable
 * (B81). It never replaces an existing edition: the same id answers with a
 * conflict, and a full account with a limit error (B70).
 *
 * @phpstan-import-type EditionInput from EditionValidator
 */
final readonly class StoreEdition
{
    /**
     * @param EditionInput $input
     *
     * @throws EditionConflict
     * @throws EditionLimitReached
     */
    public function handle(User $user, array $input): Edition
    {
        $userId = $user->publicId();

        $existing = Edition::query()->where('user_id', $userId)->where('edition_id', $input['id'])->first();

        if ($existing instanceof Edition) {
            throw new EditionConflict($existing);
        }

        $limit = self::limit();

        if (Edition::query()->where('user_id', $userId)->count() >= $limit) {
            throw new EditionLimitReached($limit);
        }

        $edition = new Edition([
            'user_id' => $userId,
            'edition_id' => $input['id'],
            'schema_version' => $input['schemaVersion'],
            'name' => $input['name'],
            'language' => $input['language'],
            'currency' => $input['currency'],
            'theme' => $input['theme'],
            'board_profile' => $input['boardProfile'],
            'parts' => $input['parts'],
            'elements' => EditionPayload::asObject($input['elements']),
            'template' => $input['template'] ?? null,
            'money_amount' => $input['moneyAmount'] ?? null,
            'revision' => $input['revision'],
            'created_at_ms' => $input['createdAt'],
            'updated_at_ms' => $input['updatedAt'],
        ]);
        $edition->save();

        // Read back, so `elements` is the array the rest of the code expects.
        return $edition->fresh() ?? $edition;
    }

    public static function limit(): int
    {
        $limit = config('printopoly.limits.editions_per_account');

        return is_int($limit) ? $limit : 20;
    }
}
