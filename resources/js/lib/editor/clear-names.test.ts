import { templateEdition } from '@/data/templates';
import { runChecks } from '@/lib/checks/checks';
import { differsFromBaseline } from '@/lib/edition/baseline';
import { applyChanges } from '@/lib/edition/changes';
import { resolveEdition } from '@/lib/edition/resolve';
import { parseEdition } from '@/lib/edition/schema';
import type { Edition } from '@/lib/edition/types';
import { elementLabel } from '@/lib/editor/catalogue';
import { buildCheckInput } from '@/lib/editor/checks-input';
import { panelActions } from '@/lib/editor/panel-sections';
import { sampleEdition } from '@/testing/editions';

import {
    NAMED_SPACE_KEYS,
    canClearNames,
    clearNamesChanges,
    emptyNameKeys,
} from './clear-names';

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
});
