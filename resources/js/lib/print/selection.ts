import {
    PRINT_SELECTION_PARTS,
    type Edition,
    type PrintSelection,
    type PrintSelectionPart,
} from '@/lib/edition/types';
import type { PrintSet } from '@/types/generated';

import { hasHouseRulesCard } from './composition';

/**
 * What goes in the print set (B198, B199). The print page is the only place that chooses, and it keeps the choice
 * on the edition as `printSelection`; the editor reads it through `printSelectionOf` to show what is left out.
 *
 * An edition the print page never saw has no `printSelection`: its parts then come from the edition's own `parts`
 * (what it had switched on before B198, or what its template switched on), and the set is the home set (B199).
 */
export function defaultPrintSelection(
    edition: Pick<Edition, 'parts' | 'elements'>,
): PrintSelection {
    const on = (...ids: (keyof Edition['parts'])[]) =>
        ids.some((id) => edition.parts[id]);
    const wanted: Record<PrintSelectionPart, boolean> = {
        board: true,
        cards: on('deeds', 'cards') || hasHouseRulesCard(edition),
        money: on('money'),
        tokens: on('pawns'),
        box_lid: on('boxLid'),
        invitation: on('invitation'),
        rules_booklet: on('rulesBooklet'),
    };

    return {
        set: 'home',
        parts: PRINT_SELECTION_PARTS.filter((part) => wanted[part]),
    };
}

/** The choice of the print page, or the default when it never chose. */
export function printSelectionOf(
    edition: Pick<Edition, 'parts' | 'elements' | 'printSelection'>,
): PrintSelection {
    return edition.printSelection ?? defaultPrintSelection(edition);
}

/** Whether a part is in the set: the board always is. */
export function inPrintSelection(
    selection: PrintSelection,
    part: PrintSelectionPart,
): boolean {
    return part === 'board' || selection.parts.includes(part);
}

/** The selection with one part switched; the board stays in, and the parts keep print-page order. */
export function toggleSelectionPart(
    selection: PrintSelection,
    part: PrintSelectionPart,
): PrintSelection {
    if (part === 'board') {
        return selection;
    }
    const on = !selection.parts.includes(part);

    return {
        ...selection,
        parts: PRINT_SELECTION_PARTS.filter((id) =>
            id === part ? on : id === 'board' || selection.parts.includes(id),
        ),
    };
}

/** The parts the server leaves out of a set: every printable part that is not chosen. */
export function skippedOf(selection: PrintSelection): PrintSelectionPart[] {
    return PRINT_SELECTION_PARTS.filter(
        (part) => !inPrintSelection(selection, part),
    );
}

/** A selection from the parts a print job skips, for a job page in a browser that does not hold the edition. */
export function selectionFromSkipped(
    base: PrintSelection,
    skipped: readonly string[],
    set: PrintSet,
): PrintSelection {
    return {
        set,
        parts: base.parts.filter(
            (part) => part === 'board' || !skipped.includes(part),
        ),
    };
}
