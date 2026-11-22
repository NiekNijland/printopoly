import { setElement } from '@/lib/edition/changes';
import { deedKey, spaceKey } from '@/lib/edition/keys';
import type {
    Edition,
    ElementChange,
    ElementOverride,
} from '@/lib/edition/types';
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
 * grayscale) of the space and everything on its title deed. Price, rent and colour group belong to the position
 * on the board (B29, B58) and stay where they are: the own amounts of a space (`amounts`, B132) are kept at their
 * position, because their range follows the standard amount of that position. Moving them made a brown street
 * carry a light blue price, which the edition rejects on the next read. All changes go to the session in one
 * `apply`, so they are one undo step.
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
            const { change } = setElement(
                edition,
                key,
                withAmountsOf(
                    edition.elements[other],
                    edition.elements[key]?.amounts,
                ),
            );

            if (change !== null) {
                changes.push(change);
            }
        }
    }

    return changes;
}

/** `override` with the own amounts of the position it moves to, instead of its own. */
function withAmountsOf(
    override: ElementOverride | undefined,
    amounts: ElementOverride['amounts'],
): ElementOverride | undefined {
    const { amounts: _moved, ...rest } = override ?? {};
    const next: ElementOverride =
        amounts === undefined ? rest : { ...rest, amounts };

    return Object.keys(next).length === 0 ? undefined : next;
}
