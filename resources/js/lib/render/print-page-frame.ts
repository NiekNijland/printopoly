import type { Size } from '../../types/print';
import type { PageItemKind, PageSpec, PrintEdition } from './print-composition';
import { cropMarksFor, type Imposition } from './print-imposition';

/** The most sets one PDF holds; the same as PrintJob::MAX_COPIES. */
const MAX_SETS = 40;

export const BLEED = 3;
/**
 * Room outside the bleed of a print-shop page for the crop marks (B160). The marks run from the bleed edge to 1 mm
 * before the edge of the page; the server writes the TrimBox and BleedBox at the same distances.
 */
const MARKS = 6;
export const CARD: Size = { w: 63, h: 88 };
/** One unfolded pawn (PAWN_SIZE_MM of components/render/pawn.tsx; print-document.test.tsx keeps them equal). */
export const TOKEN_SIZE: Size = { w: 40, h: 55 };

export const fromImposition = (
    imp: Imposition,
    kind: PageItemKind,
    itemFor: (index: number) => { key: string | null; label: string },
): PageSpec[] => {
    return imp.sheets.map((sheet) => ({
        size: imp.sheet,
        label: sheet.label,
        cropMarks: sheet.cropMarks,
        foldLines: sheet.foldLines,
        items: sheet.items.map((slot) => {
            const { key, label } = itemFor(slot.index);

            return {
                id: `${kind}.${String(slot.index)}`,
                kind,
                elementKey: key,
                label,
                bleed: slot.bleed,
                trim: slot.trim,
            };
        }),
    }));
};

/**
 * A print-shop page that is one piece with bleed, with room around it for crop marks (B160): the page grows by
 * MARKS on every side and the marks sit in that room, outside the bleed.
 */
export const withCropMarks = (page: PageSpec): PageSpec => {
    const shift = <T extends { x: number; y: number }>(rect: T): T => ({
        ...rect,
        x: rect.x + MARKS,
        y: rect.y + MARKS,
    });
    const items = page.items.map((item) => ({
        ...item,
        bleed: shift(item.bleed),
        trim: shift(item.trim),
    }));

    return {
        ...page,
        size: { w: page.size.w + 2 * MARKS, h: page.size.h + 2 * MARKS },
        items,
        cropMarks: items.flatMap((item) =>
            cropMarksFor(item.trim, BLEED, MARKS - 1),
        ),
    };
};

/** The number of sets a PDF holds: at least one, at most MAX_SETS. */
export const setsOf = (edition: Pick<PrintEdition, 'sets'>): number => {
    const sets = edition.sets;

    return typeof sets === 'number' && Number.isFinite(sets)
        ? Math.min(MAX_SETS, Math.max(1, Math.floor(sets)))
        : 1;
};

/**
 * The pages of one set, again for every set (B242): with more than one set every item gets its set number and every
 * page says which set it holds, so a stack that comes off the printer sorts itself.
 */
export const perSet = (sets: number, pages: () => PageSpec[]): PageSpec[] => {
    if (sets < 2) {
        return pages();
    }

    return Array.from({ length: sets }, (_, index) =>
        pages().map((page) => ({
            ...page,
            label:
                page.label === null
                    ? null
                    : `${page.label} · SET ${String(index + 1)}`,
            items: page.items.map((item) => ({
                ...item,
                setNumber: index + 1,
            })),
        })),
    ).flat();
};
