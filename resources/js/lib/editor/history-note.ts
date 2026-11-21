import { firstStreetKey } from '@/lib/boxes/labels';
import { parseKey, spaceKey } from '@/lib/edition/keys';
import type {
    ElementChange,
    ElementField,
    ElementOverride,
} from '@/lib/edition/types';
import { deedsFor } from '@/lib/game/standard-edition';

import { sectionOfKey, type EditionSection } from './edition-panel';

/** Where the editor goes after an undo or redo: an element (maybe its deed side), or a section of the edition. */
export type HistoryTarget =
    | { kind: 'element'; key: string; deed: boolean }
    | { kind: 'edition'; section: EditionSection };

/** Fields that have a word of their own in the note ("naam van Molenweg"); others name only the element. */
export const NOTED_FIELDS = [
    'name',
    'text',
    'photo',
    'amount',
    'amounts',
    'color',
    'town',
    'layers',
    'icon',
    'purpose',
    'subtitle',
    'background',
] as const satisfies readonly ElementField[];

export type NotedField = (typeof NOTED_FIELDS)[number];

/** What an undo or redo touched, for the short note and for the jump (UX 7, ronde 3). */
export interface HistoryStepInfo {
    target: HistoryTarget | undefined;
    /** The element the note names; `undefined` when more than one element changed. */
    elementKey: string | undefined;
    /** The one field that changed, when it has a word of its own. */
    field: NotedField | undefined;
    /** How many elements changed. */
    count: number;
}

function changedFields(change: ElementChange): string[] {
    const before: ElementOverride = change.before ?? {};
    const after: ElementOverride = change.after ?? {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

    return [...keys].filter(
        (key) =>
            JSON.stringify(before[key as ElementField]) !==
            JSON.stringify(after[key as ElementField]),
    );
}

/** The place in the editor that shows an element key. */
export function targetOfKey(
    key: string,
    fields: readonly string[] = [],
): HistoryTarget | undefined {
    const section = sectionOfKey(key);
    if (section !== null) {
        return { kind: 'edition', section };
    }
    const parsed = parseKey(key);
    switch (parsed?.kind) {
        case undefined:
            return undefined;
        case 'deed': {
            const space = deedsFor()[Number(key.split('.')[1]) - 1];

            return space === undefined
                ? undefined
                : {
                      kind: 'element',
                      key: spaceKey(space.position),
                      deed: true,
                  };
        }
        case 'group': {
            // The colour of a group lives under Uiterlijk; its town at the first street of the group.
            if (fields.includes('color')) {
                return { kind: 'edition', section: 'look' };
            }
            const street = firstStreetKey(key);

            return street === undefined
                ? undefined
                : { kind: 'element', key: street, deed: false };
        }
        default:
            return { kind: 'element', key, deed: false };
    }
}

/** What an undo or redo did, in terms the editor can show and say. */
export function describeHistoryStep(
    changes: readonly ElementChange[],
): HistoryStepInfo {
    const first = changes[0];
    const fields = first === undefined ? [] : changedFields(first);
    const only = fields.length === 1 ? fields[0] : undefined;

    return {
        target:
            first === undefined ? undefined : targetOfKey(first.key, fields),
        elementKey: changes.length === 1 ? first?.key : undefined,
        field:
            changes.length === 1 &&
            only !== undefined &&
            (NOTED_FIELDS as readonly string[]).includes(only)
                ? (only as NotedField)
                : undefined,
        count: changes.length,
    };
}
