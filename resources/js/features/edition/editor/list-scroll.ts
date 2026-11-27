/**
 * How far the left list scrolls to show the chosen row: nothing when it is in sight, otherwise just enough. The
 * search field sticks to the top of the list, so a row under it is out of sight too.
 */
export const listScrollDelta = (
    list: { top: number; bottom: number },
    row: { top: number; bottom: number },
    covered: number,
): number => {
    const top = list.top + covered;
    if (row.top < top) {
        return row.top - top;
    }
    if (row.bottom > list.bottom) {
        return row.bottom - list.bottom;
    }

    return 0;
};
