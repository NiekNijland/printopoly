import {
    resolvedCardOf,
    type ResolvedEdition,
} from '@/lib/render/edition-resolve';
import type { PhotoPlacement, PhotoStyle } from '@/lib/render/edition-types';

export type ResolvedPart = {
    photo: PhotoPlacement | undefined;
    photoStyle: PhotoStyle | undefined;
};

/** The resolved photo of any element key, or `undefined` for a key that is switched off. */
export const lookupResolved = (
    resolved: ResolvedEdition,
    key: string,
): ResolvedPart | undefined => {
    const [kind, a] = key.split('.');
    const n = Number(a);

    switch (kind) {
        case 'space':
            return resolved.spaces[n];
        case 'deed':
            return resolved.deeds?.[n - 1];
        case 'card':
            return resolvedCardOf(resolved, key);
        case 'card_back':
            return a === 'chance' || a === 'chest'
                ? resolved.cardBacks?.[a]
                : (resolved.deedBack ?? undefined);
        case 'note':
            return resolved.money?.notes.find((note) => note.value === n);
        case 'pawn':
            return resolved.pawns?.find((pawn) => pawn.index === n);
        case 'box_lid':
            return resolved.boxLid ?? undefined;
        case 'board_center':
            return resolved.boardCenter;
        case 'house_rules':
            return resolved.houseRules ?? undefined;
        case 'rules_booklet':
            return resolved.rulesBooklet ?? undefined;
        case 'invitation':
            return resolved.invitation ?? undefined;
        case undefined:
        default:
            return undefined;
    }
};
