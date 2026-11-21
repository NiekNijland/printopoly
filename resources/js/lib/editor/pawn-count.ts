import { updateElement } from '@/lib/edition/changes';
import { PAWN_COUNT, pawnKey } from '@/lib/edition/keys';
import type { Edition, ElementChange } from '@/lib/edition/types';

/** The fewest pawns a set has: a game needs two players. */
export const MIN_PAWNS = 2;

/** The pawns in the set, in order: the ones that are not taken out (`hidden`). */
export function visiblePawnKeys(edition: Pick<Edition, 'elements'>): string[] {
    return Array.from({ length: PAWN_COUNT }, (_, i) => pawnKey(i + 1)).filter(
        (key) => edition.elements[key]?.hidden !== true,
    );
}

/**
 * The changes that make the set hold `count` pawns (UX 9): fewer takes out the last pawns, more puts back the first
 * ones that were out. `keep` (the pawn on screen) stays in. What a pawn has (name, photo) stays, so putting it back
 * brings it back as it was. All changes go to the session in one `apply`, so they are one undo step.
 */
export function pawnCountChanges(
    edition: Edition,
    count: number,
    keep?: string,
): ElementChange[] {
    const wanted = Math.min(PAWN_COUNT, Math.max(MIN_PAWNS, Math.round(count)));
    const visible = visiblePawnKeys(edition);
    const all = Array.from({ length: PAWN_COUNT }, (_, i) => pawnKey(i + 1));
    const flips =
        wanted < visible.length
            ? visible
                  .filter((key) => key !== keep)
                  .slice(wanted - (visible.includes(keep ?? '') ? 1 : 0))
                  .map((key) => [key, true] as const)
            : all
                  .filter((key) => !visible.includes(key))
                  .slice(0, wanted - visible.length)
                  .map((key) => [key, undefined] as const);
    const changes: ElementChange[] = [];
    let next = edition;

    for (const [key, hidden] of flips) {
        const step = updateElement(next, key, { hidden });
        next = step.edition;
        if (step.change !== null) {
            changes.push(step.change);
        }
    }

    return changes;
}
