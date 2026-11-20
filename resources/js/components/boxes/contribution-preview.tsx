import { useMemo } from 'react';

import {
    ElementPreview,
    previewSize,
} from '@/components/editor/element-preview';
import { firstStreetKey } from '@/lib/boxes/labels';
import type { BoxContributionData } from '@/lib/boxes/types';
import { resolveEdition } from '@/lib/edition/resolve';
import type { Edition } from '@/lib/edition/types';
import type { PhotoInfos } from '@/lib/editor/photo-cache';

import { ScaledElement } from './scaled-element';

const PREVIEW_PHOTO_ID = 'box-contribution-preview';

interface ContributionPreviewProps {
    edition: Edition;
    contribution: Pick<
        BoxContributionData,
        'elementKey' | 'field' | 'value' | 'width' | 'height'
    >;
    /** Object URL of the contribution's photo, once it is loaded. */
    photoUrl: string | null;
    photos: PhotoInfos;
    maxWidth?: number;
    maxHeight?: number;
}

/**
 * What an element would look like with a contribution on it (B128), drawn by the real renderers on a copy of the
 * edition. Nothing is applied: the owner looks first and decides after.
 */
export function ContributionPreview({
    edition,
    contribution,
    photoUrl,
    photos,
    maxWidth = 280,
    maxHeight = 260,
}: ContributionPreviewProps) {
    const withPhoto = photoUrl !== null;
    const draft = useMemo<Edition>(() => {
        const current = edition.elements[contribution.elementKey] ?? {};

        return {
            ...edition,
            parts: { ...edition.parts, cards: true, pawns: true },
            elements: {
                ...edition.elements,
                [contribution.elementKey]: {
                    ...current,
                    ...(contribution.value !== null && contribution.value !== ''
                        ? { [contribution.field]: contribution.value }
                        : {}),
                    ...(withPhoto
                        ? {
                              photo: {
                                  photoId: PREVIEW_PHOTO_ID,
                                  cx: 0.5,
                                  cy: 0.5,
                                  scale: 1,
                                  rotation: 0,
                                  grayscale: false,
                              },
                          }
                        : {}),
                },
            },
        };
    }, [edition, contribution, withPhoto]);

    const resolved = useMemo(() => resolveEdition(draft), [draft]);
    const infos = useMemo<PhotoInfos>(() => {
        const map = new Map(photos);
        if (photoUrl !== null) {
            map.set(PREVIEW_PHOTO_ID, {
                id: PREVIEW_PHOTO_ID,
                url: photoUrl,
                width: contribution.width ?? 1200,
                height: contribution.height ?? 900,
            });
        }

        return map;
    }, [photos, photoUrl, contribution.width, contribution.height]);

    // A town shows on the streets of its colour group: preview the first one.
    const target = {
        key: firstStreetKey(contribution.elementKey) ?? contribution.elementKey,
    };
    const size = previewSize(target, draft);

    return (
        <ScaledElement
            widthMm={size.w}
            heightMm={size.h}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            enlarge={2.4}
        >
            <ElementPreview
                target={target}
                resolved={resolved}
                photos={infos}
            />
        </ScaledElement>
    );
}
