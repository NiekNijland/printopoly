import {
    BOX_LID_KEY,
    INVITATION_KEY,
    RULES_BOOKLET_KEY,
} from '@/lib/render/edition-keys';
import type { Rect, Segment } from '../../types/print';
import type { BoardProfile } from './print-board';
import { calibrationSheet } from './print-calibration';
import type { PageItem, PageSpec, PrintSet } from './print-composition';
import {
    A4,
    BOOKLET_PAGE,
    BOOKLET_PAGES,
    INVITATION,
    bookletSpreads,
    invitationCells,
    invitationCutLines,
} from './print-extras';
import { cropMarksFor } from './print-imposition';
import { LID_MARGIN, lidTiles } from './print-lid-tiles';
import { BLEED } from './print-page-frame';

export const boxLid = (profile: BoardProfile, set: PrintSet): PageSpec[] => {
    const item = profile.boxLid;

    if (set === 'printer') {
        const size = { w: item.w + 2 * BLEED, h: item.h + 2 * BLEED };

        return [
            {
                size,
                label: null,
                cropMarks: [],
                foldLines: [],
                items: [
                    {
                        id: 'box-lid',
                        kind: 'box-lid',
                        elementKey: BOX_LID_KEY,
                        label: 'Doosdeksel',
                        bleed: { x: 0, y: 0, ...size },
                        trim: { x: BLEED, y: BLEED, ...item },
                    },
                ],
            },
        ];
    }

    // At home the lid goes on A4, in pieces that overlap when it is larger (R5-29): nobody needs an A3 printer.
    const { page, tiles } = lidTiles(item);

    return tiles.map((tile) => {
        const shift = (rect: Rect): Rect => ({
            x: rect.x - tile.visible.x + LID_MARGIN,
            y: rect.y - tile.visible.y + LID_MARGIN,
            w: rect.w,
            h: rect.h,
        });
        const shiftSegment = (segment: Segment): Segment => ({
            x1: segment.x1 - tile.visible.x + LID_MARGIN,
            y1: segment.y1 - tile.visible.y + LID_MARGIN,
            x2: segment.x2 - tile.visible.x + LID_MARGIN,
            y2: segment.y2 - tile.visible.y + LID_MARGIN,
        });
        const label =
            tiles.length === 1
                ? 'Doosdeksel'
                : `Doosdeksel deel ${String(tile.number)} van ${String(tiles.length)}`;
        const trim = shift(tile.cut);

        return {
            size: page,
            label,
            cropMarks: cropMarksFor(trim, BLEED, 3),
            foldLines: tile.guides.map(shiftSegment),
            items: [
                {
                    id: tile.id,
                    kind: 'box-lid' as const,
                    elementKey: BOX_LID_KEY,
                    label,
                    bleed: shift(tile.visible),
                    trim,
                },
            ],
        };
    });
};

/** One A5 page of the booklet, with 3 mm bleed for the print shop. */
export const bookletPrinter = (): PageSpec[] => {
    const size = {
        w: BOOKLET_PAGE.w + 2 * BLEED,
        h: BOOKLET_PAGE.h + 2 * BLEED,
    };

    return Array.from({ length: BOOKLET_PAGES }, (_, index) => ({
        size,
        label: null,
        cropMarks: [],
        foldLines: [],
        items: [
            {
                id: `booklet.${String(index + 1)}`,
                kind: 'booklet-page' as const,
                elementKey: RULES_BOOKLET_KEY,
                label: `Pagina ${String(index + 1)}`,
                bleed: { x: 0, y: 0, ...size },
                trim: { x: BLEED, y: BLEED, ...BOOKLET_PAGE },
            },
        ],
    }));
};

/**
 * The booklet for the home printer: two A5 pages side by side on A4 landscape, in the order that folds into a
 * booklet when the sheets are printed on both sides (flip on the short edge) and folded in half.
 */
export const bookletHome = (): PageSpec[] => {
    // A4 landscape, with the two A5 pages in the middle and the fold exactly halfway.
    const size = { w: A4.h, h: A4.w };
    const fold = size.w / 2;
    const top = (size.h - BOOKLET_PAGE.h) / 2;

    return bookletSpreads().map(([left, right], index) => {
        const item = (page: number, x: number): PageItem => ({
            id: `booklet.${String(page)}`,
            kind: 'booklet-page',
            elementKey: RULES_BOOKLET_KEY,
            label: `Pagina ${String(page)}`,
            bleed: { x, y: top, ...BOOKLET_PAGE },
            trim: { x, y: top, ...BOOKLET_PAGE },
        });

        return {
            size,
            label: `Blad ${String(Math.floor(index / 2) + 1)}, ${index % 2 === 0 ? 'voorkant' : 'achterkant'}`,
            cropMarks: [],
            // Two short ticks on the fold, at the top and the bottom edge.
            foldLines: [
                { x1: fold, y1: 0, x2: fold, y2: 3 },
                { x1: fold, y1: size.h - 3, x2: fold, y2: size.h },
            ],
            items: [item(left, fold - BOOKLET_PAGE.w), item(right, fold)],
        };
    });
};

/** One A6 card with bleed for the print shop; four on an A4 sheet for home, divided by dashed lines. */
export const invitation = (set: PrintSet): PageSpec[] => {
    if (set === 'printer') {
        const size = {
            w: INVITATION.w + 2 * BLEED,
            h: INVITATION.h + 2 * BLEED,
        };

        return [
            {
                size,
                label: null,
                cropMarks: [],
                foldLines: [],
                items: [
                    {
                        id: 'invitation.1',
                        kind: 'invitation',
                        elementKey: INVITATION_KEY,
                        label: 'Uitnodiging',
                        bleed: { x: 0, y: 0, ...size },
                        trim: { x: BLEED, y: BLEED, ...INVITATION },
                    },
                ],
            },
        ];
    }

    return [
        {
            size: A4,
            label: null,
            cropMarks: [],
            foldLines: invitationCutLines(),
            items: invitationCells().map((cell, index) => ({
                id: `invitation.${String(index + 1)}`,
                kind: 'invitation' as const,
                elementKey: INVITATION_KEY,
                label: 'Uitnodiging',
                bleed: cell,
                trim: cell,
            })),
        },
    ];
};

export const calibration = (profile: BoardProfile): PageSpec[] => {
    const sheet = calibrationSheet(profile);
    const item = (id: string, rect: Rect, label: string): PageItem => ({
        id,
        kind: 'calibration',
        elementKey: null,
        label,
        bleed: rect,
        trim: rect,
    });

    return [
        {
            size: sheet.page,
            label: 'Proefvel',
            cropMarks: [],
            foldLines: [],
            items: [
                item(
                    'ruler',
                    {
                        x: sheet.ruler.x,
                        y: sheet.ruler.y,
                        w: sheet.ruler.length,
                        h: 8,
                    },
                    'Liniaal 100 mm',
                ),
                item('bank-card', sheet.bankCard, 'Bankpas'),
                item(
                    'corner-space',
                    sheet.cornerSpace,
                    sheet.cornerSpace.label,
                ),
                item(
                    'normal-space',
                    sheet.normalSpace,
                    sheet.normalSpace.label,
                ),
            ],
        },
    ];
};
