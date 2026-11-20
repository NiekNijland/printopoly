import { setElement, updateElement } from '@/lib/edition/changes';
import type { EditionSession } from '@/lib/edition/session';
import type { ElementOverride } from '@/lib/edition/types';

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

/** "Terug naar standaard": drops every override of an element. */
export function resetElement(session: EditionSession, key: string): void {
    const { change } = setElement(session.edition, key, undefined);
    if (change !== null) {
        session.apply([change]);
    }
}
