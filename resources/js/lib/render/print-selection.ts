import {
    PRINT_SELECTION_PART_IDS,
    type Edition,
    type PartId,
    type Parts,
    type PrintSelection,
} from '@/lib/render/edition-types';
import type { PrintSet } from '@/types/generated';

import { hasHouseRulesCard } from './print-composition';

/**
 * What goes in the print set (B198, B199). The print page is the only place that chooses, and it keeps the choice
 * on the edition as `printSelection`, in the names of the edition parts, so the editor can read it.
 *
 * An edition the print page never saw has no `printSelection`: its parts then come from the edition's own `parts`
 * (what it had switched on before B198, or what its template switched on), and the set is the home set (B199).
 */

/** The rows of the print page that can go in a set, in the order they sit on the page (B149, B200). */
export const SET_PARTS = [
    'board',
    'cards',
    'money',
    'tokens',
    'box_lid',
    'invitation',
    'rules_booklet',
] as const;

export type SetPart = (typeof SET_PARTS)[number];

/** The edition parts of each row: the house rules card prints with the cards. */
const EDITION_PARTS: Readonly<Record<SetPart, readonly PartId[]>> = {
    board: ['board'],
    cards: ['deeds', 'cards', 'houseRules'],
    money: ['money'],
    tokens: ['pawns'],
    box_lid: ['boxLid'],
    invitation: ['invitation'],
    rules_booklet: ['rulesBooklet'],
};

/** The row of the print page that holds an edition part: the pawns are on the row Pionnen (`tokens`). */
export const setPartOf = (part: PartId): SetPart | undefined => {
    return SET_PARTS.find((row) => EDITION_PARTS[row].includes(part));
};

/** A selection of these rows; the board is always in. */
export const selectionOfRows = (
    set: PrintSet,
    rows: readonly SetPart[],
): PrintSelection => {
    return {
        set,
        parts: PRINT_SELECTION_PART_IDS.filter(
            (id) =>
                id === 'board' ||
                rows.some((row) => EDITION_PARTS[row].includes(id)),
        ),
    };
};

export const defaultPrintSelection = (
    edition: Pick<Edition, 'parts' | 'elements'>,
): PrintSelection => {
    const on = (...ids: PartId[]) => ids.some((id) => edition.parts[id]);
    const wanted: Record<SetPart, boolean> = {
        board: true,
        cards: on('deeds', 'cards') || hasHouseRulesCard(edition),
        money: on('money'),
        tokens: on('pawns'),
        box_lid: on('boxLid'),
        invitation: on('invitation'),
        rules_booklet: on('rulesBooklet'),
    };

    return selectionOfRows(
        'home',
        SET_PARTS.filter((part) => wanted[part]),
    );
};

/** The choice of the print page, or the default when it never chose. */
export const printSelectionOf = (
    edition: Pick<Edition, 'parts' | 'elements' | 'printSelection'>,
): PrintSelection => {
    return edition.printSelection ?? defaultPrintSelection(edition);
};

/** Whether a row is in the set: the board always is. */
export const inPrintSelection = (
    selection: PrintSelection,
    part: SetPart,
): boolean => {
    return (
        part === 'board' ||
        EDITION_PARTS[part].some((id) => selection.parts.includes(id))
    );
};

/** The rows of the set, in page order. */
export const setPartsOf = (selection: PrintSelection): SetPart[] => {
    return SET_PARTS.filter((part) => inPrintSelection(selection, part));
};

/** The selection with one row switched; the board stays in. */
export const toggleSelectionPart = (
    selection: PrintSelection,
    part: SetPart,
): PrintSelection => {
    if (part === 'board') {
        return selection;
    }
    const on = !inPrintSelection(selection, part);

    return selectionOfRows(
        selection.set,
        SET_PARTS.filter((row) =>
            row === part ? on : inPrintSelection(selection, row),
        ),
    );
};

/** The rows the server leaves out of a set: every row that is not chosen. */
export const skippedOf = (selection: PrintSelection): SetPart[] => {
    return SET_PARTS.filter((part) => !inPrintSelection(selection, part));
};

/** A selection from the parts a print job skips, for a job page in a browser that does not hold the edition. */
export const selectionFromSkipped = (
    base: PrintSelection,
    skipped: readonly string[],
    set: PrintSet,
): PrintSelection => {
    return selectionOfRows(
        set,
        setPartsOf(base).filter((part) => !skipped.includes(part)),
    );
};

/**
 * The edition as the set prints it, for "Nog even nakijken" (B197): only the parts in the set give messages, the
 * same as `checkView` of the editor.
 */
export const editionInSet = (
    edition: Edition,
    selection: PrintSelection,
): Edition => {
    const parts = Object.fromEntries(
        Object.keys(edition.parts).map((id) => [
            id,
            id === 'board' || selection.parts.includes(id as PartId),
        ]),
    ) as Parts;
    // The house rules card goes with the cards; the check itself only speaks up about a card someone started and
    // emptied again, the same as in the editor (B210).

    return { ...edition, parts };
};
