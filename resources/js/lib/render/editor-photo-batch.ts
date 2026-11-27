import { parseKey } from '@/lib/render/edition-keys';
import { spaceAt } from '@/lib/render/standard-edition';

/**
 * What kind of photo place an element is, for a choice of several photos (bug 7, ronde 4): streets go with streets,
 * stations with stations, cards with cards. `null` for an element that never takes part in such a choice: a corner
 * (a photo there is a lost little square) or the board centre.
 */
export const photoKindOf = (key: string): string | null => {
    const parsed = parseKey(key);
    if (parsed === null || parsed.kind === 'boardCenter') {
        return null;
    }
    if (parsed.kind !== 'space') {
        return parsed.kind;
    }
    const type = spaceAt(Number(key.split('.')[1])).type;

    return type === 'corner' ? null : `space:${type}`;
};
