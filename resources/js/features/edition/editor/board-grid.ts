import { groupColor as groupColorOf } from '@/lib/render/edition-group-names';
import { spaceKey } from '@/lib/render/edition-keys';
import type { Edition } from '@/lib/render/edition-types';
import { BOARD_ORDER, stepKey } from '@/lib/render/editor-catalogue';
import { canSwap, swapTargets } from '@/lib/render/editor-swap';
import { spaceWidth, type BoardProfile } from '@/lib/render/print-board';
import { spaceAt } from '@/lib/render/standard-edition';

/** The board position of a `space.NN` key, or null for the centre. */
export const positionOf = (key: string): number | null => {
    return key.startsWith('space.') ? Number(key.slice(6)) : null;
};

export const canSwapKeys = (a: string, b: string): boolean => {
    const first = positionOf(a);
    const second = positionOf(b);

    return first !== null && second !== null && canSwap(first, second);
};

/** Row and column (0 to 10) of a position on the board. Position 0 is bottom right. */
export const gridCell = (position: number): { row: number; col: number } => {
    if (position <= 10) {
        return { row: 10, col: 10 - position };
    }
    if (position <= 20) {
        return { row: 10 - (position - 10), col: 0 };
    }
    if (position <= 30) {
        return { row: 0, col: position - 20 };
    }

    return { row: position - 30, col: 10 };
};

export const groupColor = (
    position: number,
    edition: Edition,
): string | null => {
    const space = spaceAt(position);
    if (space.type !== 'street') {
        return null;
    }

    // The colour the group is printed in, so Riso's brown group is purple here too (bug 27).
    return groupColorOf(edition, space.group);
};

/** Which side of the board a cell is on, so the colour band sits on the inner edge, 20% deep as on the board. */
export const bandStyle = (position: number, color: string): string => {
    const toward =
        position < 10
            ? 'to bottom'
            : position < 20
              ? 'to left'
              : position < 30
                ? 'to top'
                : 'to right';

    return `linear-gradient(${toward}, ${color} 20%, transparent 20%)`;
};

/**
 * The rows and columns of the navigator in the proportions of the board: a corner, nine spaces and a corner,
 * each as wide as in the profile (mm as `fr`), so spaces are narrow and deep and corners larger.
 */
export const gridTemplate = (profile: BoardProfile): string => {
    const space = spaceWidth(profile);

    return `${profile.corner}fr repeat(9, ${space}fr) ${profile.corner}fr`;
};

/**
 * Where the photo of a space sits in its cell of the mini board, as a share of the cell: clear of the colour band on
 * the inner edge. The size is set on both axes (R5-06): an image with only its edges set keeps its own width, so a
 * photo on a side row ran over the next spaces and off the board.
 */
export const miniPhotoBox = (
    position: number,
): {
    left: string;
    top: string;
    width: string;
    height: string;
} => {
    const box = (left: number, top: number, width: number, height: number) => ({
        left: `${String(left)}%`,
        top: `${String(top)}%`,
        width: `${String(width)}%`,
        height: `${String(height)}%`,
    });

    if (position % 10 === 0) {
        return box(12, 12, 76, 76);
    }
    if (position < 10) {
        // Bottom row: the band is on top.
        return box(8, 26, 84, 66);
    }
    if (position < 20) {
        // Left column: the band is on the right.
        return box(8, 8, 66, 84);
    }
    if (position < 30) {
        // Top row: the band is at the bottom.
        return box(8, 8, 84, 66);
    }

    // Right column: the band is on the left.
    return box(26, 8, 66, 84);
};

export const walkKey = (
    from: string,
    forward: boolean,
    selectable: ((key: string) => boolean) | undefined,
): string | undefined => {
    let next = stepKey(BOARD_ORDER, from, forward ? 1 : -1);
    for (
        let guard = 0;
        next !== undefined &&
        selectable !== undefined &&
        !selectable(next) &&
        guard < BOARD_ORDER.length;
        guard++
    ) {
        next = stepKey(BOARD_ORDER, next, forward ? 1 : -1);
    }

    return next;
};

export const firstSwapTarget = (key: string): string | undefined => {
    const position = positionOf(key);
    const first =
        position === null
            ? undefined
            : (swapTargets(position).find((other) => other > position) ??
              swapTargets(position)[0]);

    return first === undefined ? undefined : spaceKey(first);
};

export const nextSwapTarget = (
    from: string,
    target: string,
    forward: boolean,
): string | undefined => {
    const position = positionOf(from);
    const options =
        position === null ? [] : swapTargets(position).map(spaceKey);
    const at = options.indexOf(target);

    return options[(at + (forward ? 1 : -1) + options.length) % options.length];
};
