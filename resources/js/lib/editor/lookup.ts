import type { ResolvedEdition } from '@/lib/edition/resolve';
import type { LayoutId, PhotoPlacement } from '@/lib/edition/types';

export interface ResolvedPart {
    layout: LayoutId;
    photo: PhotoPlacement | undefined;
}

/** The resolved layout and photo of any element key, or `undefined` for a key that is switched off. */
export function lookupResolved(
    resolved: ResolvedEdition,
    key: string,
): ResolvedPart | undefined {
    const [kind, a, b] = key.split('.');
    const n = Number(a);

    switch (kind) {
        case 'space':
            return resolved.spaces[n];
        case 'deed':
            return resolved.deeds?.[n - 1];
        case 'card':
            return resolved.decks?.[a === 'chance' ? 'chance' : 'chest'][
                Number(b) - 1
            ];
        case 'card_back':
            return a === 'chance' || a === 'chest'
                ? resolved.cardBacks?.[a]
                : (resolved.deedBack ?? undefined);
        case 'note':
            return resolved.money?.notes.find((note) => note.value === n);
        case 'pawn':
            return resolved.pawns?.[n - 1];
        case 'box_lid':
            return resolved.boxLid ?? undefined;
        case 'board_center':
            return resolved.boardCenter;
        default:
            return undefined;
    }
}
