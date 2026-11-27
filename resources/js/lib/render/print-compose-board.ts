import type { BoardProfile } from './print-board';
import type { PageItem, PageSpec, PrintSet } from './print-composition';
import { packStickers, stickerPieces } from './print-home-stickers';
import { SHEET_PRESETS, cropMarksFor } from './print-imposition';
import { BLEED } from './print-page-frame';
import { splitPanels } from './print-panels';

const boardPrinter = (profile: BoardProfile): PageSpec[] => {
    return splitPanels(profile).map((panel) => ({
        size: panel.size,
        label: `Paneel ${panel.id}`,
        cropMarks: [],
        foldLines: [],
        items: [
            {
                id: `panel.${panel.id}`,
                kind: 'panel' as const,
                elementKey: null,
                label: `Paneel ${panel.id}`,
                bleed: { x: 0, y: 0, ...panel.size },
                trim: {
                    x: panel.trimOffset.x,
                    y: panel.trimOffset.y,
                    w: panel.trim.w,
                    h: panel.trim.h,
                },
            },
        ],
    }));
};

/**
 * The whole board in one piece for the print shop (B243): one page at full size with 3 mm bleed, for foam board,
 * dibond or a poster.
 */
const boardWhole = (profile: BoardProfile): PageSpec[] => {
    const size = { w: profile.outer + 2 * BLEED, h: profile.outer + 2 * BLEED };

    return [
        {
            size,
            label: null,
            cropMarks: [],
            foldLines: [],
            items: [
                {
                    id: 'board.whole',
                    kind: 'panel' as const,
                    elementKey: null,
                    label: 'Bord',
                    bleed: { x: 0, y: 0, ...size },
                    trim: {
                        x: BLEED,
                        y: BLEED,
                        w: profile.outer,
                        h: profile.outer,
                    },
                },
            ],
        },
    ];
};

const boardHome = (profile: BoardProfile): PageSpec[] => {
    const pieces = stickerPieces(profile);
    const byId = new Map(pieces.map((piece) => [piece.id, piece]));

    return packStickers(pieces).map((sheet) => {
        const items = sheet.placements.map((placement): PageItem => {
            const piece = byId.get(placement.id);
            const bleed = {
                x: placement.x,
                y: placement.y,
                w: placement.w,
                h: placement.h,
            };

            return {
                id: placement.id,
                kind: piece?.kind === 'center' ? 'center' : 'space',
                elementKey: null,
                label: placement.id,
                bleed,
                trim: {
                    x: bleed.x + BLEED,
                    y: bleed.y + BLEED,
                    w: bleed.w - 2 * BLEED,
                    h: bleed.h - 2 * BLEED,
                },
                rotated: placement.rotated,
            };
        });

        return {
            size: SHEET_PRESETS.A4,
            label: `Bord ${String(sheet.index + 1)}`,
            items,
            cropMarks: items.flatMap((item) =>
                cropMarksFor(item.trim, BLEED, 3),
            ),
            foldLines: [],
        };
    });
};

/** The board for the print shop as panels or one whole board (B243), or as stickers at home. */
export const boardPages = (
    set: PrintSet,
    whole: boolean,
    profile: BoardProfile,
): PageSpec[] => {
    if (set === 'home') {
        return boardHome(profile);
    }

    return whole ? boardWhole(profile) : boardPrinter(profile);
};
