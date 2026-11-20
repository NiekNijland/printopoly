import { setElement } from '@/lib/edition/changes';
import { deedKey, spaceKey } from '@/lib/edition/keys';
import type { Edition, ElementChange } from '@/lib/edition/types';
import { deedsFor, spaceAt } from '@/lib/game/standard-edition';

/** The kind of space two spaces must share to be swapped: streets, stations and utilities only. */
function swapKind(position: number): 'street' | 'station' | 'utility' | null {
    const type = spaceAt(position).type;

    return type === 'street' || type === 'station' || type === 'utility'
        ? type
        : null;
}

/** Whether the user's content may move between two board positions. */
export function canSwap(a: number, b: number): boolean {
    const kind = swapKind(a);

    return a !== b && kind !== null && kind === swapKind(b);
}

/** The positions a space can be swapped with, in board order. */
export function swapTargets(position: number): number[] {
    return Array.from({ length: 40 }, (_, index) => index).filter((other) =>
        canSwap(position, other),
    );
}

/**
 * The changes that swap what the user made of two spaces: the name and the photo (with its transform and
 * grayscale) of the space and everything on its title deed. Price, rent and colour group are not stored in
 * the edition: they belong to the position on the board (B29, B58) and stay where they are. All changes
 * go to the session in one `apply`, so they are one undo step.
 */
export function swapChanges(
    edition: Edition,
    a: number,
    b: number,
): ElementChange[] {
    if (!canSwap(a, b)) {
        return [];
    }

    const deeds = deedsFor();
    const deedOf = (position: number): string =>
        deedKey(deeds.findIndex((space) => space.position === position) + 1);
    const pairs: [string, string][] = [
        [spaceKey(a), spaceKey(b)],
        [deedOf(a), deedOf(b)],
    ];
    const changes: ElementChange[] = [];

    for (const [first, second] of pairs) {
        for (const [key, other] of [
            [first, second],
            [second, first],
        ] as const) {
            const { change } = setElement(edition, key, edition.elements[other]);

            if (change !== null) {
                changes.push(change);
            }
        }
    }

    return changes;
}
