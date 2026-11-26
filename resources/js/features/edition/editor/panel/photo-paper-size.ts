import { fullStyleKey } from '@/features/edition/editor/photo-style-choice';
import type { ElementKind } from '@/lib/render/edition-keys';
import { parseKey } from '@/lib/render/edition-keys';

/** Kinds with a photo size line, and the thing the photo is printed on: "Op het deksel", not "Op het bord" (R5-08). */
const PRINTED_ON: Partial<Record<ElementKind, string>> = {
    space: 'editor.photo_on_space',
    deed: 'editor.photo_on_deed',
    card: 'editor.photo_on_card',
    note: 'editor.photo_on_note',
    pawn: 'editor.photo_on_pawn',
    boxLid: 'editor.photo_on_boxLid',
};

/** Above this many mm a face fills the photo anyway, so the line gives only the size. */
const CLOSE_UP_MM = 60;

/** How large the photo is on paper and on what (UX 4 of ronde 4, R5-08). */
export const paperSize = (
    t: (key: string, replacements?: Record<string, string | number>) => string,
    editKey: string,
    full: boolean,
    frame: { w: number; h: number },
    dpi: number,
): string => {
    const kind = parseKey(editKey)?.kind;
    const on = kind === undefined ? undefined : PRINTED_ON[kind];
    const where = t(on ?? 'editor.photo_on_space');
    const size = {
        where,
        w: Math.round(frame.w),
        h: Math.round(frame.h),
        ppi: Math.round(dpi),
        full: t(fullStyleKey(kind)),
    };

    if (Math.min(frame.w, frame.h) >= CLOSE_UP_MM) {
        return t('editor.photo_paper_size_large', size);
    }

    return t(
        full ? 'editor.photo_paper_size' : 'editor.photo_paper_size_framed',
        size,
    );
};
