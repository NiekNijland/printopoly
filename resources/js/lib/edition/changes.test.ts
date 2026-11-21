import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from '@/lib/print/board';
import {
    applyChanges,
    applyEditionPatch,
    changedElementKeys,
    createEdition,
    defaultCurrency,
    diffEditions,
    invertChanges,
    isEmptyOverride,
    sameOverride,
    setElement,
    updateElement,
} from './changes';
import { makeEdition, photo } from './test-utils';
import { DEFAULT_PARTS } from './types';

describe('the amount of play money (B156)', () => {
    it('travels in a patch, and null goes back to the default of each set', () => {
        const base = makeEdition();
        const chosen = { ...base, moneyAmount: 'eight' as const };

        expect(diffEditions(base, chosen)).toEqual({
            baseRevision: base.revision,
            moneyAmount: 'eight',
        });
        expect(diffEditions(chosen, base)).toEqual({
            baseRevision: chosen.revision,
            moneyAmount: null,
        });
        expect(
            applyEditionPatch(base, { baseRevision: 0, moneyAmount: 'full' }, 1)
                .moneyAmount,
        ).toBe('full');
        expect(
            'moneyAmount' in
                applyEditionPatch(
                    chosen,
                    { baseRevision: 0, moneyAmount: null },
                    1,
                ),
        ).toBe(false);
    });
});

describe('createEdition', () => {
    it('starts as the standard edition with default parts (B59, B99)', () => {
        const edition = createEdition(
            {
                name: '  Kerst  ',
                language: 'en',
                theme: 'riso',
                boardProfile: DEFAULT_BOARD_PROFILE,
            },
            { id: 'x', now: 5 },
        );
        expect(edition).toMatchObject({
            id: 'x',
            name: 'Kerst',
            currency: 'gbp',
            revision: 0,
            createdAt: 5,
            updatedAt: 5,
            elements: {},
        });
        expect(edition.parts).toEqual(DEFAULT_PARTS);
        expect(edition.parts).toMatchObject({
            board: true,
            deeds: true,
            cards: true,
            money: false,
            pawns: false,
            boxLid: false,
            houseRules: false,
        });
    });

    it('uses euro for Dutch (B72) and keeps a chosen currency', () => {
        expect(defaultCurrency('nl')).toBe('eur');
        expect(defaultCurrency('en')).toBe('gbp');
        expect(makeEdition({ language: 'nl', currency: 'usd' }).currency).toBe(
            'usd',
        );
    });

    it('never lets the board be switched off', () => {
        expect(
            makeEdition({ parts: { board: false, money: true } }).parts,
        ).toMatchObject({ board: true, money: true });
    });
});

describe('setElement and updateElement', () => {
    it('returns a change with before and after', () => {
        const { edition, change } = setElement(makeEdition(), 'space.01', {
            name: 'Stadspark',
        });
        expect(edition.elements['space.01']).toEqual({ name: 'Stadspark' });
        expect(change).toEqual({
            key: 'space.01',
            before: undefined,
            after: { name: 'Stadspark' },
        });
    });

    it('does not mutate the old edition', () => {
        const before = makeEdition();
        setElement(before, 'space.01', { name: 'x' });
        expect(before.elements).toEqual({});
    });

    it('removes an override that has nothing left in it', () => {
        const start = setElement(makeEdition(), 'space.01', {
            name: 'A',
        }).edition;
        const { edition, change } = updateElement(start, 'space.01', {
            name: undefined,
        });
        expect(edition.elements).toEqual({});
        expect(change?.after).toBeUndefined();
    });

    it('reports no change when nothing differs', () => {
        const start = setElement(makeEdition(), 'space.01', {
            name: 'A',
            text: 'B',
        }).edition;
        expect(
            setElement(start, 'space.01', { text: 'B', name: 'A' }).change,
        ).toBeNull();
        expect(setElement(start, 'space.02', {}).change).toBeNull();
    });

    it('merges fields', () => {
        let edition = makeEdition();
        edition = updateElement(edition, 'space.01', { name: 'A' }).edition;
        edition = updateElement(edition, 'space.01', {
            photo: photo(),
        }).edition;
        expect(edition.elements['space.01']).toEqual({
            name: 'A',
            photo: photo(),
        });
    });

    it('tells empty overrides', () => {
        expect(isEmptyOverride(undefined)).toBe(true);
        expect(isEmptyOverride({ name: undefined })).toBe(true);
        expect(isEmptyOverride({ name: '' })).toBe(false);
        expect(
            sameOverride(
                { name: 'A', photo: photo() },
                { photo: photo(), name: 'A' },
            ),
        ).toBe(true);
    });
});

describe('applyChanges and invertChanges', () => {
    it('applies forward and back', () => {
        const base = makeEdition();
        const a = setElement(base, 'space.01', { name: 'A' });
        const b = updateElement(a.edition, 'space.01', { name: 'B' });
        const c = setElement(b.edition, 'deed.01', { name: 'T' });
        const changes = [a.change, b.change, c.change].flatMap((change) =>
            change === null ? [] : [change],
        );

        expect(applyChanges(base, changes)).toEqual(c.edition);
        expect(applyChanges(c.edition, invertChanges(changes))).toEqual(base);
    });
});

describe('diffEditions and applyEditionPatch', () => {
    it('is null when nothing changed', () => {
        expect(diffEditions(makeEdition(), makeEdition())).toBeNull();
    });

    it('holds only the changed elements and settings', () => {
        const base = setElement(makeEdition(), 'space.01', {
            name: 'A',
        }).edition;
        const next = setElement(
            setElement(base, 'space.02', { name: 'B' }).edition,
            'space.01',
            undefined,
        ).edition;
        const patch = diffEditions(
            { ...base, revision: 4 },
            { ...next, name: 'Nieuw', theme: 'strak' },
        );

        expect(patch).toEqual({
            baseRevision: 4,
            name: 'Nieuw',
            theme: 'strak',
            elements: { 'space.01': null, 'space.02': { name: 'B' } },
        });
        expect(changedElementKeys(base, next)).toEqual([
            'space.01',
            'space.02',
        ]);
    });

    it('detects part and board profile changes', () => {
        const base = makeEdition();
        const patch = diffEditions(base, {
            ...base,
            parts: { ...base.parts, money: true },
            boardProfile: { ...base.boardProfile, outer: 508 },
        });
        expect(patch?.parts?.money).toBe(true);
        expect(patch?.boardProfile?.outer).toBe(508);
        expect(patch?.elements).toBeUndefined();
    });

    it('applies a patch and bumps the revision', () => {
        const base = setElement(makeEdition(), 'space.01', {
            name: 'A',
        }).edition;
        const next = applyEditionPatch(
            base,
            {
                baseRevision: 0,
                name: 'Nieuw',
                elements: { 'space.01': null, 'space.02': { name: 'B' } },
            },
            77,
        );
        expect(next).toMatchObject({
            name: 'Nieuw',
            revision: 1,
            updatedAt: 77,
            elements: { 'space.02': { name: 'B' } },
        });
        expect(next.elements['space.01']).toBeUndefined();
        expect(next.createdAt).toBe(base.createdAt);
    });

    it('round-trips: base plus diff equals the next edition', () => {
        const base = makeEdition();
        let next = updateElement(base, 'card.chance.03', {
            text: 'Hoi',
            amount: 50,
        }).edition;
        next = { ...next, language: 'en' };
        const patch = diffEditions(base, next);
        expect(patch).not.toBeNull();
        const applied = applyEditionPatch(
            base,
            patch ?? { baseRevision: 0 },
            9,
        );
        expect({
            ...applied,
            revision: 0,
            updatedAt: base.updatedAt,
        }).toEqual(next);
    });
});
