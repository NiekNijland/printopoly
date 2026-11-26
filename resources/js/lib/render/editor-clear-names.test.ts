import { runChecks } from '@/lib/render/checks';
import { differsFromBaseline } from '@/lib/render/edition-baseline';
import { applyChanges } from '@/lib/render/edition-changes';
import { NAMED_SPACE_KEYS } from '@/lib/render/edition-keys';
import { resolveEdition } from '@/lib/render/edition-resolve';
import { parseEdition } from '@/lib/render/edition-schema';
import { templateEdition } from '@/lib/render/edition-templates';
import type { Edition } from '@/lib/render/edition-types';
import { elementLabel } from '@/lib/render/editor-catalogue';
import { buildCheckInput } from '@/lib/render/editor-checks-input';
import { panelActions } from '@/lib/render/editor-panel-sections';
import { makeEdition } from '@/testing/edition-test-utils';
import { sampleEdition } from '@/testing/editions';

import {
    canClearNames,
    clearNamesChanges,
    clearNamesDone,
    emptiedEdition,
    emptyNameKeys,
    ownNameKeys,
} from './editor-clear-names';

const PHOTO = {
    photoId: 'p1',
    cx: 0.5,
    cy: 0.5,
    scale: 1,
    rotation: 0,
    grayscale: false,
};

describe('Namen leegmaken (B201)', () => {
    const party = (): Edition => {
        const edition = templateEdition('party', 'nl')!;

        return {
            ...edition,
            elements: {
                ...edition.elements,
                'space.01': {
                    ...edition.elements['space.01'],
                    photo: PHOTO,
                },
            },
        };
    };

    it('empties the 28 streets, stations and utilities and leaves the rest', () => {
        const edition = party();
        const next = applyChanges(edition, clearNamesChanges(edition));

        expect(NAMED_SPACE_KEYS).toHaveLength(28);
        expect(NAMED_SPACE_KEYS).not.toContain('space.00');
        expect(NAMED_SPACE_KEYS).toContain('space.05');
        expect(NAMED_SPACE_KEYS).toContain('space.12');
        expect(NAMED_SPACE_KEYS.map((key) => next.elements[key]?.name)).toEqual(
            NAMED_SPACE_KEYS.map(() => ''),
        );
        expect(next.elements['space.01']?.photo).toEqual(PHOTO);
        expect(next.elements['card.chance.01']).toEqual(
            edition.elements['card.chance.01'],
        );
        expect(next.elements.house_rules).toEqual(edition.elements.house_rules);
        expect(canClearNames(edition)).toBe(true);
        expect(canClearNames(next)).toBe(false);
        expect(clearNamesChanges(next)).toEqual([]);
    });

    it('also empties the standard names of a blank edition, which has no names of its own', () => {
        const edition: Edition = { ...sampleEdition(), elements: {} };
        const next = applyChanges(edition, clearNamesChanges(edition));
        const board = resolveEdition(next).spaces;

        expect(board.find((space) => space.position === 1)?.name).toBe('');
        expect(board.find((space) => space.position === 0)?.name).not.toBe('');
        expect(emptyNameKeys(next)).toHaveLength(28);
    });

    it('can be undone in one step: every change knows the name it had', () => {
        const edition = party();
        const changes = clearNamesChanges(edition);
        const next = applyChanges(edition, changes);
        const back = applyChanges(
            next,
            [...changes].reverse().map((change) => ({
                key: change.key,
                before: change.after,
                after: change.before,
            })),
        );

        expect(back.elements).toEqual(edition.elements);
        expect(
            Object.keys(back.elements).filter((key) =>
                differsFromBaseline(back, key),
            ),
        ).toEqual(['space.01']);
    });

    it('is a valid edition afterwards and the Controle names each space without a name', () => {
        const edition = party();
        const next = applyChanges(edition, clearNamesChanges(edition));

        expect(parseEdition(next).ok).toBe(true);
        const issues = runChecks(
            buildCheckInput(next, new Map(), new Map()),
        ).filter((issue) => issue.code === 'space.no-name');
        expect(issues).toHaveLength(28);
        expect(issues[0]).toMatchObject({ field: 'name', severity: 'warning' });
        expect(issues[0]?.message.nl).toContain('terug naar standaard');
    });

    it('sits in the ⋯ menu of every street, station and utility, next to the other actions', () => {
        const edition = party();
        const next = applyChanges(edition, clearNamesChanges(edition));

        expect(panelActions('space.01', edition)).toContain('clearNames');
        expect(panelActions('space.05', edition)).toContain('clearNames');
        expect(panelActions('space.28', edition)).toContain('clearNames');
        expect(panelActions('space.00', edition)).not.toContain('clearNames');
        expect(panelActions('space.02', edition)).not.toContain('clearNames');
        expect(panelActions('card.chance.01', edition)).not.toContain(
            'clearNames',
        );
        expect(panelActions('space.01', next)).not.toContain('clearNames');
    });

    it('still gives a space without a name a label in the list', () => {
        const edition = party();
        const next = applyChanges(edition, clearNamesChanges(edition));

        expect(elementLabel('space.06', next, 'nl')).toBe(
            'Vak 6, nog zonder naam',
        );
        expect(elementLabel('space.06', next, 'en')).toBe(
            'Space 6, no name yet',
        );
        expect(elementLabel('space.06', edition, 'nl')).toBe('De ballonnen');
    });

    it('leaves the names you typed yourself (R6 Sara, B258)', () => {
        const typed: Edition = {
            ...party(),
            elements: {
                ...party().elements,
                'space.03': { name: 'Huis van Lieke' },
                'space.05': { name: 'De juf' },
            },
        };
        const next = applyChanges(typed, clearNamesChanges(typed));

        expect(next.elements['space.03']?.name).toBe('Huis van Lieke');
        expect(next.elements['space.05']?.name).toBe('De juf');
        expect(next.elements['space.06']?.name).toBe('');
        expect(ownNameKeys(typed)).toEqual(['space.03', 'space.05']);
        // With only your own names left, there is nothing to clear.
        expect(canClearNames(next)).toBe(false);
    });

    it('says how many of your own names stayed', () => {
        const t = (key: string, replace?: Record<string, string | number>) =>
            `${key}${replace?.count === undefined ? '' : `:${String(replace.count)}`}`;

        expect(clearNamesDone(t, 0)).toBe('editor.clear_names_done');
        expect(clearNamesDone(t, 1)).toBe('editor.clear_names_done_kept_one:1');
        expect(clearNamesDone(t, 4)).toBe('editor.clear_names_done_kept:4');
    });
});

describe('Leeg in Nieuwe editie (B259)', () => {
    it('empties every name and every Chance and Community Chest card, and nothing else', () => {
        const edition = sampleEdition();
        const empty = emptiedEdition(edition);

        expect(
            NAMED_SPACE_KEYS.map((key) => empty.elements[key]?.name),
        ).toEqual(NAMED_SPACE_KEYS.map(() => ''));
        expect(empty.elements['card.chance.01']?.text).toBe('');
        expect(empty.elements['card.chest.16']?.text).toBe('');
        expect(empty.elements.house_rules).toEqual(
            edition.elements.house_rules,
        );
        expect(empty.elements['space.00']).toEqual(
            edition.elements['space.00'],
        );
        // It stays a valid edition, also for the server's schema.
        expect(parseEdition(JSON.parse(JSON.stringify(empty))).ok).toBe(true);
    });

    it('shows no change dot on an untouched Leeg edition, and one on a name you type (integration r7)', () => {
        const empty = emptiedEdition(makeEdition({ language: 'nl' }));
        const changed = Object.keys(empty.elements).filter((key) =>
            differsFromBaseline(empty, key),
        );

        expect(empty.template).toBe('empty');
        expect(changed).toEqual([]);
        expect(canClearNames(empty)).toBe(false);
        // The template survives a round trip through the schema.
        const parsed = parseEdition(JSON.parse(JSON.stringify(empty)));
        expect(parsed.ok && parsed.value.template).toBe('empty');

        const typed = applyChanges(empty, [
            {
                key: 'space.01',
                before: empty.elements['space.01'],
                after: { name: 'Bakkerij' },
            },
        ]);
        expect(differsFromBaseline(typed, 'space.01')).toBe(true);
        expect(ownNameKeys(typed)).toEqual(['space.01']);
    });
});
