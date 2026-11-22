import type { Rect, Segment, Size } from './types';

/**
 * The extra print items (B123): the rules booklet and the invitation.
 * Geometry and page counts only; the renderers (components/render) and `composePages` read from here, and
 * `app/Print/PrintLayout.php` holds the same numbers as the independent expectation (B107).
 */

export const A4: Size = { w: 210, h: 297 };

/** A booklet page: A5, in portrait. */
export const BOOKLET_PAGE: Size = { w: 148.5, h: 210 };
/** Sixteen pages fold to four A4 sheets, printed on both sides (a multiple of four). */
export const BOOKLET_PAGES = 16;

/** Page numbers, left and right, of each side of a sheet when the booklet is folded in half (A4 landscape). */
export function bookletSpreads(
    pages: number = BOOKLET_PAGES,
): [number, number][] {
    const spreads: [number, number][] = [];

    for (let sheet = 0; sheet < pages / 4; sheet++) {
        spreads.push([pages - 2 * sheet, 2 * sheet + 1]);
        spreads.push([2 * sheet + 2, pages - 2 * sheet - 1]);
    }

    return spreads;
}

/** Number of printed sides of the home booklet (A4 landscape, duplex). */
export const BOOKLET_HOME_SIDES = BOOKLET_PAGES / 2;

export const INVITATION: Size = { w: 105, h: 148 };

/** The four A6 invitations on a home sheet (A4 holds four A6 exactly, so there are no margins). */
export function invitationCells(): Rect[] {
    return [0, 1].flatMap((row) =>
        [0, 1].map((col) => ({
            x: col * INVITATION.w,
            y: row * INVITATION.h,
            w: INVITATION.w,
            h: INVITATION.h,
        })),
    );
}

/** The dashed lines that divide the sheet into its four invitations. */
export function invitationCutLines(): Segment[] {
    return [
        { x1: INVITATION.w, y1: 0, x2: INVITATION.w, y2: 2 * INVITATION.h },
        { x1: 0, y1: INVITATION.h, x2: 2 * INVITATION.w, y2: INVITATION.h },
    ];
}
