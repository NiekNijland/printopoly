import { describe, expect, it } from 'vitest';

import { describeHistoryStep } from './history-note';

describe('describeHistoryStep (UX 7, ronde 3)', () => {
    it('names the one field of the one element that changed', () => {
        expect(
            describeHistoryStep([
                {
                    key: 'space.03',
                    before: { name: 'Opel' },
                    after: undefined,
                },
            ]),
        ).toEqual({
            target: { kind: 'element', key: 'space.03', deed: false },
            elementKey: 'space.03',
            field: 'name',
            count: 1,
        });
    });

    it('goes to the deed side of the space for a deed', () => {
        expect(
            describeHistoryStep([
                { key: 'deed.01', before: undefined, after: { name: 'X' } },
            ]).target,
        ).toEqual({ kind: 'element', key: 'space.01', deed: true });
    });

    it('opens Uiterlijk for a group colour and the first street for its town', () => {
        expect(
            describeHistoryStep([
                {
                    key: 'group.brown',
                    before: undefined,
                    after: { color: '#884422' },
                },
            ]).target,
        ).toEqual({ kind: 'edition', section: 'look' });
        expect(
            describeHistoryStep([
                {
                    key: 'group.brown',
                    before: undefined,
                    after: { town: 'Lutten' },
                },
            ]).target,
        ).toEqual({ kind: 'element', key: 'space.01', deed: false });
    });

    it('opens the Woorden section for a word', () => {
        expect(
            describeHistoryStep([
                {
                    key: 'words.house',
                    before: undefined,
                    after: { name: 'hut' },
                },
            ]).target,
        ).toEqual({ kind: 'edition', section: 'words' });
    });

    it('counts several elements, names no single one and goes to the first on the board', () => {
        const info = describeHistoryStep([
            { key: 'space.03', before: undefined, after: { name: 'B' } },
            { key: 'space.01', before: undefined, after: { name: 'A' } },
        ]);

        expect(info.elementKey).toBeUndefined();
        // Both changed only the name: the note can say "2 namen".
        expect(info.field).toBe('name');
        expect(info.count).toBe(2);
        expect(info.target).toEqual({
            kind: 'element',
            key: 'space.01',
            deed: false,
        });
    });
});
