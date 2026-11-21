import { baselineElement, baselineField } from '@/lib/edition/baseline';
import { setElement, updateElement } from '@/lib/edition/changes';
import type { EditionSession } from '@/lib/edition/session';
import type { ElementField, ElementOverride } from '@/lib/edition/types';

/**
 * Merges fields into an element of the open edition. `group` joins steps of one gesture
 * (dragging, a zoom slider) into one undo step. A field set to `undefined` is cleared.
 */
export function editElement(
    session: EditionSession,
    key: string,
    patch: Partial<ElementOverride>,
    group: string | null = null,
): void {
    const { change } = updateElement(session.edition, key, patch);
    if (change !== null) {
        session.apply([change], group);
    }
}

/** "Terug naar standaard": the element as its baseline has it, the template or the standard game (B152). */
export function resetElement(session: EditionSession, key: string): void {
    const base = baselineElement(session.edition, key);
    const { change } = setElement(
        session.edition,
        key,
        base === undefined ? undefined : structuredClone(base),
    );
    if (change !== null) {
        session.apply([change]);
    }
}

/** The patch that puts some fields of an element back to their baseline (the "Standaard" button, B142, B152). */
function standardPatch(
    session: EditionSession,
    key: string,
    fields: readonly ElementField[],
): Partial<ElementOverride> {
    return Object.fromEntries(
        fields.map((field) => {
            const value = baselineField(session.edition, key, field);

            return [
                field,
                value === undefined ? undefined : structuredClone(value),
            ];
        }),
    );
}

/** "Standaard" on one field: back to the baseline value, in one undo step. */
export function resetField(
    session: EditionSession,
    key: string,
    field: ElementField,
): void {
    editElement(session, key, standardPatch(session, key, [field]));
}
