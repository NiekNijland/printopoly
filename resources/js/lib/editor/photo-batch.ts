import { parseKey } from '@/lib/edition/keys';
import type { Edition } from '@/lib/edition/types';
import { holdsPhoto } from '@/lib/editor/catalogue';
import { spaceAt } from '@/lib/game/standard-edition';

/**
 * What kind of photo place an element is, for a choice of several photos (bug 7, ronde 4): streets go with streets,
 * stations with stations, cards with cards. `null` for an element that never takes part in such a choice: a corner
 * (a photo there is a lost little square) or the board centre.
 */
export function photoKindOf(key: string): string | null {
    const parsed = parseKey(key);
    if (parsed === null || parsed.kind === 'boardCenter') {
        return null;
    }
    if (parsed.kind !== 'space') {
        return parsed.kind;
    }
    const type = spaceAt(Number(key.split('.')[1])).type;

    return type === 'corner' ? null : `space:${type}`;
}

export interface PhotoBatchPlan {
    /** Where the photos go, in order: the chosen element first, then empty elements of the same kind. */
    targets: string[];
    /**
     * Every element the photos of this choice may go to, for the list "foto → vak" (UX 4): the chosen element and
     * every empty element of the same kind after it.
     */
    pool: string[];
    /** Elements passed over before the last target: a photo already, another kind, or no place for a photo. */
    skipped: number;
}

/**
 * Plans a choice of several photos (bug 7, ronde 4). The first photo goes on the element that is open, as always.
 * The others only go on elements of the same kind that have no photo yet, so a choice never overwrites a photo and
 * never lands on a corner or a station that is not like the element you started from.
 */
export function planPhotoBatch(
    edition: Edition,
    editKey: string,
    siblings: readonly string[],
    count: number,
): PhotoBatchPlan {
    const kind = photoKindOf(editKey);
    const fits = (key: string): boolean =>
        kind !== null &&
        photoKindOf(key) === kind &&
        holdsPhoto(key) &&
        edition.elements[key]?.photo === undefined;
    const pool = [editKey, ...siblings.filter(fits)];
    const targets = pool.slice(0, Math.max(0, count));
    const last = targets.at(-1);
    const passed =
        last === undefined || last === editKey
            ? []
            : siblings.slice(0, siblings.indexOf(last));

    return {
        targets,
        pool: count > 1 ? pool : [editKey],
        skipped: passed.filter((key) => !fits(key)).length,
    };
}
