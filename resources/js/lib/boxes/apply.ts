import { isExtraCardKey } from '@/lib/edition/keys';
import type { EditionRepository } from '@/lib/edition/repository';
import type { EditionSession } from '@/lib/edition/session';
import type { ElementOverride, PhotoRecord } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import { nextExtraCardKey } from '@/lib/editor/extra-cards';
import { ingestPhoto } from '@/lib/editor/ingest';
import { startingPlacement } from '@/lib/editor/placements';
import type { Locale } from '@/lib/game/types';
import { formatPhotoError } from '@/lib/photos/validation';

import { newCardDeck } from './proposals';
import type { BoxContributionData, ContributionPart } from './types';

/** Why a contribution could not be applied; `message` is a sentence for the owner. */
export class ApplyError extends Error {}

export interface ApplyDeps {
    session: EditionSession;
    repository: EditionRepository;
    /** Fetches the photo of the contribution (only the owner may). */
    fetchPhoto: (contribution: BoxContributionData) => Promise<Blob>;
    /** Makes a new photo available to the editor at once. */
    onPhoto?: (record: PhotoRecord) => void;
    locale: Locale;
    /** Text for "your storage is full". */
    storageFullMessage: string;
    failedMessage: string;
    /** Text for "this deck has 32 cards already", for a new card (B175). */
    deckFullMessage?: string;
}

/**
 * Applies a contribution to the local edition (B128): the suggested name or text goes on the element, and the photo
 * is downloaded into this browser's own store like a photo the owner chose, with the standard placement. The
 * browser does it, because the edition lives here (B78). A photo that cannot be stored stops everything, so
 * nothing is half applied.
 *
 * `parts` picks what to apply (B175): only the name, only the photo, only the amount. Without it every open part
 * goes in. A new card (`newcard.*`) always goes in whole, as the next extra card of its deck.
 *
 * @returns The element the contribution went on.
 */
export async function applyContribution(
    contribution: BoxContributionData,
    deps: ApplyDeps,
    parts?: readonly ContributionPart[],
): Promise<string> {
    const patch: Partial<ElementOverride> = {};
    const deck = newCardDeck(contribution.elementKey);
    const key =
        deck === null
            ? contribution.elementKey
            : nextExtraCardKey(deps.session.edition, deck);
    if (key === undefined) {
        throw new ApplyError(deps.deckFullMessage ?? deps.failedMessage);
    }
    const chosen = new Set<ContributionPart>(
        deck !== null || parts === undefined ? contribution.open : parts,
    );

    if (
        chosen.has('photo') &&
        contribution.hasPhoto &&
        contribution.photoUrl !== null
    ) {
        let blob: Blob;
        try {
            blob = await deps.fetchPhoto(contribution);
        } catch {
            throw new ApplyError(deps.failedMessage);
        }
        const file = new File([blob], `${contribution.firstName}.jpg`, {
            type: blob.type === '' ? 'image/jpeg' : blob.type,
        });
        const result = await ingestPhoto(
            file,
            deps.repository,
            deps.session.edition.id,
        );

        if (!result.ok) {
            throw new ApplyError(
                'storageFull' in result
                    ? deps.storageFullMessage
                    : formatPhotoError(result.error, deps.locale),
            );
        }

        deps.onPhoto?.(result.record);
        patch.photo = startingPlacement(result.record.id, result.record);
    }

    if (
        chosen.has(contribution.field) &&
        contribution.value !== null &&
        contribution.value !== ''
    ) {
        patch[contribution.field] = contribution.value;
    }

    if (chosen.has('amount') && contribution.amount !== null) {
        patch.amount = contribution.amount;
    }

    // An extra card the owner took out after the friend sent this comes back with it (B135), and a new card is one.
    if (
        Object.keys(patch).length > 0 &&
        isExtraCardKey(key) &&
        deps.session.edition.elements[key]?.added !== true
    ) {
        patch.added = true;
    }

    if (Object.keys(patch).length > 0) {
        editElement(deps.session, key, patch);
    }

    return key;
}
