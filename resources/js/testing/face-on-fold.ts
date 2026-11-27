import { BOARD_CENTER_KEY } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import type { Edition, PhotoPlacement } from '@/lib/render/edition-types';
import { centerFoldItems } from '@/lib/render/editor-layer-fold';
import type { BoardProfile } from '@/lib/render/print-board';
import { makeEdition } from '@/testing/edition-test-utils';
import type { Size } from '@/types/print';

export const faceOnFold = (
    profile: BoardProfile,
    placement: PhotoPlacement,
    size: Size,
): boolean => {
    const edition: Edition = {
        ...makeEdition({ boardProfile: profile }),
        elements: { [BOARD_CENTER_KEY]: { background: placement } },
    };

    return centerFoldItems(
        edition,
        resolveEdition(edition).boardCenter,
        size,
    ).some((item) => item.what === 'face');
};
