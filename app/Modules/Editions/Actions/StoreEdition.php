<?php

declare(strict_types=1);

namespace App\Modules\Editions\Actions;

use App\Models\Edition;
use App\Models\User;
use App\Modules\Editions\Exceptions\EditionLimitReachedException;
use App\Modules\Editions\Support\EditionConflict;
use App\Modules\Editions\Support\EditionPayload;
use App\Modules\Editions\Support\EditionValidator;

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
     * @throws EditionLimitReachedException
     */
    public function handle(User $user, array $input): Edition
    {
        $userId = $user->publicId();

        $existing = Edition::query()->where('user_id', $userId)->where('edition_id', $input['id'])->first();

        throw_if($existing instanceof Edition, EditionConflict::class, $existing);

        $limit = self::limit();

        throw_if(Edition::query()->where('user_id', $userId)->count() >= $limit, EditionLimitReachedException::class, $limit);

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
            'print_selection' => $input['printSelection'] ?? null,
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
