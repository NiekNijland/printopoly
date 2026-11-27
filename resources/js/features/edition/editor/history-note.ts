import { firstStreetKey } from '@/lib/render/boxes-labels';
import { parseKey, spaceKey } from '@/lib/render/edition-keys';
import type {
    ElementChange,
    ElementField,
    ElementOverride,
} from '@/lib/render/edition-types';
import { deedsFor } from '@/lib/render/standard-edition';

import {
    sectionOfKey,
    type EditionSection,
} from '../../../lib/render/editor-edition-panel';

/** Where the editor goes after an undo or redo: an element (maybe its deed side), or a section of the edition. */
type HistoryTarget =
    | { kind: 'element'; key: string; deed: boolean }
    | { kind: 'edition'; section: EditionSection };

/** Fields that have a word of their own in the note ("naam van Molenweg"); others name only the element. */
const NOTED_FIELDS = [
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

type NotedField = (typeof NOTED_FIELDS)[number];

const isNoted = (field: string | undefined): field is NotedField =>
    NOTED_FIELDS.some((noted) => noted === field);

const fieldsOf = (override: ElementOverride): ElementField[] =>
    Object.keys(override).filter((key): key is ElementField => key in override);

/** What an undo or redo touched, for the short note and for the jump (UX 7, ronde 3). */
export type HistoryStepInfo = {
    target: HistoryTarget | undefined;
    /** The element the note names; `undefined` when more than one element changed. */
    elementKey: string | undefined;
    /** The one field that changed, when it has a word of its own. */
    field: NotedField | undefined;
    /** How many elements changed. */
    count: number;
};

const changedFields = (change: ElementChange): string[] => {
    const before: ElementOverride = change.before ?? {};
    const after: ElementOverride = change.after ?? {};
    const keys = new Set([...fieldsOf(before), ...fieldsOf(after)]);

    return [...keys].filter(
        (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    );
};

/** The place in the editor that shows an element key. */
const targetOfKey = (
    key: string,
    fields: readonly string[] = [],
): HistoryTarget | undefined => {
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
        case 'space':
        case 'card':
        case 'note':
        case 'pawn':
        case 'cardBack':
        case 'boxLid':
        case 'boardCenter':
        case 'houseRules':
        case 'rulesBooklet':
        case 'invitation':
        case 'words':
        case 'themeAccent':
        case 'partStyle':
            return { kind: 'element', key, deed: false };
    }
};

/** What an undo or redo did, in terms the editor can show and say. */
export const describeHistoryStep = (
    changes: readonly ElementChange[],
): HistoryStepInfo => {
    // Undo gives the changes back in reverse; the note and the jump go to the first one in the edition's order.
    const ordered = [...changes].sort((a, b) =>
        a.key.localeCompare(b.key, 'en', { numeric: true }),
    );
    const first = ordered[0];
    const fields = first === undefined ? [] : changedFields(first);
    const only = fields.length === 1 ? fields[0] : undefined;
    // "4 namen": several elements that each changed the same one field.
    const same =
        only !== undefined &&
        ordered.every((change) => {
            const changed = changedFields(change);

            return changed.length === 1 && changed[0] === only;
        });

    return {
        target:
            first === undefined ? undefined : targetOfKey(first.key, fields),
        elementKey: changes.length === 1 ? first?.key : undefined,
        field: same && isNoted(only) ? only : undefined,
        count: changes.length,
    };
};
