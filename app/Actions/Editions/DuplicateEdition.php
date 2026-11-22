<?php

declare(strict_types=1);

namespace App\Actions\Editions;

use App\Edition\EditionLimitReached;
use App\Edition\EditionValidator;
use App\Edition\PrintSelection;
use App\Events\EditionDuplicated;
use App\Models\Edition;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * A copy with its own id and revision 0 (B96), in the same account. The name
 * gets " (kopie)" or " (copy)". The photos of the original are not copied here:
 * the print pipeline listens for EditionDuplicated and copies its assets.
 */
final readonly class DuplicateEdition
{
    private const array COPY_SUFFIX = ['nl' => 'kopie', 'en' => 'copy'];

    public function __construct(private StoreEdition $store)
    {
    }

    /**
     * @throws EditionLimitReached
     */
    public function handle(User $user, Edition $source, ?string $name = null): Edition
    {
        $suffix = self::COPY_SUFFIX[$source->language] ?? self::COPY_SUFFIX['en'];
        $now = (int) (microtime(true) * 1000);

        $copy = $this->store->handle($user, [
            'schemaVersion' => $source->schema_version,
            'id' => (string) Str::uuid(),
            'name' => $name ?? Str::limit("{$source->name} ({$suffix})", EditionValidator::MAX_NAME_LENGTH, ''),
            'language' => $source->language,
            'currency' => $source->currency,
            'theme' => $source->theme,
            'boardProfile' => $source->board_profile,
            'parts' => $source->parts,
            'elements' => $source->elements,
            ...(is_string($source->template) && $source->template !== '' ? ['template' => $source->template] : []),
            ...(is_string($source->money_amount) && $source->money_amount !== '' ? ['moneyAmount' => $source->money_amount] : []),
            ...(PrintSelection::parse($source->print_selection) !== null ? ['printSelection' => PrintSelection::parse($source->print_selection)] : []),
            'revision' => 0,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);

        event(new EditionDuplicated($user->publicId(), $source->edition_id, $copy->edition_id));

        return $copy;
    }
}
