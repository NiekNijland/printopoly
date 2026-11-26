import { updateElement } from '@/lib/render/edition-changes';
import {
    PAWN_COUNT,
    parseKey,
    pawnKey,
    spaceKey,
} from '@/lib/render/edition-keys';
import { MAX_NAME_LENGTH } from '@/lib/render/edition-schema';
import type { Edition, ElementChange } from '@/lib/render/edition-types';
import { spaceAt, standardEdition } from '@/lib/render/standard-edition';

/**
 * The left list as a place to type names (B161): a space or a pawn can be renamed in its row, and several lines
 * pasted in one row fill that one and the next ones of the same kind.
 */

/** Whether a row of the list has a name to type: every space but Chance and Community Chest, and the pawns. */
export function isNameable(key: string): boolean {
    const parsed = parseKey(key);
    if (parsed?.kind === 'pawn') {
        return true;
    }
    if (parsed?.kind !== 'space') {
        return false;
    }
    const type = spaceAt(Number(key.slice('space.'.length))).type;

    return type !== 'chance' && type !== 'chest';
}

/** The row and the rows after it that a paste fills: spaces of the same type further along, or the next pawns. */
function sameKindFrom(edition: Edition, key: string): string[] {
    const parsed = parseKey(key);
    if (parsed?.kind === 'pawn') {
        const pawns = Array.from({ length: PAWN_COUNT }, (_, i) =>
            pawnKey(i + 1),
        ).filter((pawn) => edition.elements[pawn]?.hidden !== true);

        return pawns.slice(Math.max(0, pawns.indexOf(key)));
    }
    if (parsed?.kind !== 'space') {
        return [];
    }
    const position = Number(key.slice('space.'.length));
    const type = spaceAt(position).type;

    return standardEdition.spaces
        .filter((space) => space.position >= position && space.type === type)
        .map((space) => spaceKey(space.position));
}

/** The lines of a paste that are names: trimmed, without empty lines, at most as long as a name may be. */
function pastedLines(text: string): string[] {
    return text
        .split(/\r\n|\r|\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .map((line) => line.slice(0, MAX_NAME_LENGTH));
}

export interface PastedNames {
    /** One undo step for all of them. */
    changes: ElementChange[];
    /** The rows that got a name, in order. */
    keys: string[];
    /** Lines that found no row of the same kind any more. */
    left: number;
    /** Spaces of another kind between the first and the last filled row, which kept their name (vindbaarheid point 3). */
    skipped: number;
}

/**
 * Several lines pasted in the row of `key`: that row gets the first line, the next rows of the same kind the
 * ones after it. `null` for a paste of one line, which is ordinary typing.
 */
export function pasteNames(
    edition: Edition,
    key: string,
    text: string,
): PastedNames | null {
    const lines = pastedLines(text);
    if (lines.length < 2) {
        return null;
    }
    const targets = sameKindFrom(edition, key).slice(0, lines.length);
    const changes: ElementChange[] = [];
    let current = edition;
    targets.forEach((target, index) => {
        const { edition: next, change } = updateElement(current, target, {
            name: lines[index],
        });
        current = next;
        if (change !== null) {
            changes.push(change);
        }
    });

    return {
        changes,
        keys: targets,
        left: lines.length - targets.length,
        skipped: skippedBetween(targets),
    };
}

/** Rows with a name between the first and the last of `keys` that were passed over: another kind of space. */
function skippedBetween(keys: readonly string[]): number {
    const first = keys[0];
    const last = keys[keys.length - 1];
    if (
        first === undefined ||
        last === undefined ||
        parseKey(first)?.kind !== 'space'
    ) {
        return 0;
    }
    const from = Number(first.slice('space.'.length));
    const to = Number(last.slice('space.'.length));

    return standardEdition.spaces.filter(
        (space) =>
            space.position > from &&
            space.position < to &&
            !keys.includes(spaceKey(space.position)) &&
            isNameable(spaceKey(space.position)),
    ).length;
}

/** Text in a form to compare for the search: lower case, without accents. */
function searchable(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

/** Whether any of the texts holds the query (everything matches an empty query). */
export function matchesQuery(
    query: string,
    ...texts: readonly (string | undefined)[]
): boolean {
    const needle = searchable(query.trim());

    return (
        needle === '' ||
        texts.some(
            (text) => text !== undefined && searchable(text).includes(needle),
        )
    );
}
