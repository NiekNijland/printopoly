import type { PawnStyle } from '@/lib/render/edition-part-styles';

export const PAWN_WIDTH = 40;

export const PANEL_HEIGHT = 22.5;
/**
 * Every pawn has the same two halves (R6 Tom, Sara): a portrait on the left, the photo or the first letter of the
 * name, and the name on the right, in the same box and so at the same size with or without a photo. The portrait
 * is a little taller than wide, the shape of a head and shoulders (ronde 3, UX 1). The styles (B271) keep the
 * portrait where it is, so the photo is cropped to the same frame in every style.
 */
export const PORTRAIT = { x: 1.5, y: 1.5, w: 17, h: PANEL_HEIGHT - 3 } as const;
export const NAME_BOX = {
    x: PORTRAIT.x + PORTRAIT.w + 1.5,
    y: 1.5,
    w: PAWN_WIDTH - (PORTRAIT.x + PORTRAIT.w + 1.5) - 1.5,
    h: PANEL_HEIGHT - 3,
} as const;
/** The largest name on any pawn, with or without a photo, also on the band of a full photo. */
export const PAWN_NAME_MAX_MM = 5;

/** The box of the name in a style: Vintage leaves room for its flourishes, Modern for its bar. */
export const nameBoxOf = (style: PawnStyle | undefined) => {
    switch (style) {
        case 'vintage':
            return { ...NAME_BOX, y: 4.6, h: 13.3 };
        case 'modern':
            return { x: NAME_BOX.x + 0.4, y: 2, w: NAME_BOX.w - 0.4, h: 15.4 };
        case 'playful':
            return { ...NAME_BOX, y: 4, h: 14.5 };
        case undefined:
            return NAME_BOX;
    }
};
