import type { EditionRepository } from '@/lib/edition/repository';
import type { EditionSession } from '@/lib/edition/session';
import type { ElementOverride, PhotoRecord } from '@/lib/edition/types';
import { editElement } from '@/lib/editor/edit';
import { ingestPhoto } from '@/lib/editor/ingest';
import type { Locale } from '@/lib/game/types';
import { defaultTransform } from '@/lib/photos/transform';
import { formatPhotoError } from '@/lib/photos/validation';

import type { BoxContributionData } from './types';

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
}

/**
 * Applies a contribution to the local edition (B128): the suggested name or text goes on the element, and the photo
 * is downloaded into this browser's own store like a photo the owner chose, with the standard placement. The
 * browser does it, because the edition lives here (B78). A photo that cannot be stored stops everything, so
 * nothing is half applied.
 */
export async function applyContribution(
    contribution: BoxContributionData,
    deps: ApplyDeps,
): Promise<void> {
    const patch: Partial<ElementOverride> = {};

    if (contribution.hasPhoto && contribution.photoUrl !== null) {
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
        const base = defaultTransform();
        patch.photo = {
            photoId: result.record.id,
            cx: base.x,
            cy: base.y,
            scale: base.scale,
            rotation: base.rotation,
            grayscale: false,
        };
    }

    if (contribution.value !== null && contribution.value !== '') {
        patch[contribution.field] = contribution.value;
    }

    if (Object.keys(patch).length > 0) {
        editElement(deps.session, contribution.elementKey, patch);
    }
}
