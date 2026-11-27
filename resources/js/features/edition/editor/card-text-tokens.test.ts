import { resolveEdition } from '@/lib/render/edition-resolve';
import { sampleEdition } from '@/testing/editions';

import { describeToken, insertChoices, parseOnly } from './card-text-tokens';

const t = (key: string): string => key;
const resolved = resolveEdition(sampleEdition());

describe('describeToken', () => {
    it('names a street, a station and a corner, and marks a missing space', () => {
        expect(
            describeToken({ type: 'space', position: 39 }, resolved, 50, t),
        ).toEqual({
            text: 'Kroonplein',
            label: 'editor.token_street: Kroonplein',
            broken: false,
        });
        expect(
            describeToken({ type: 'space', position: 5 }, resolved, 50, t)
                .label,
        ).toMatch(/^editor\.token_station: /);
        expect(
            describeToken({ type: 'space', position: 0 }, resolved, 50, t)
                .label,
        ).toMatch(/^editor\.token_space: /);
        expect(
            describeToken({ type: 'space', position: 99 }, resolved, 50, t),
        ).toEqual({ text: '', label: 'editor.token_space: ', broken: true });
    });

    it('shows the currency, the amount, a word and an unknown token', () => {
        expect(
            describeToken(parseOnly('{currency}'), resolved, 50, t).broken,
        ).toBe(false);
        const amount = describeToken(parseOnly('{amount}'), resolved, 50, t);
        expect(amount.broken).toBe(false);
        expect(amount.text).toContain('50');
        expect(
            describeToken(parseOnly('{amount}'), resolved, undefined, t),
        ).toEqual({
            text: 'editor.token_amount_unset',
            label: 'editor.token_amount_unset',
            broken: true,
        });
        expect(
            describeToken(parseOnly('{house}'), resolved, 50, t).label,
        ).toMatch(/^editor\.token_word: /);
        expect(describeToken(parseOnly('{nonsense}'), resolved, 50, t)).toEqual(
            {
                text: '{nonsense}',
                label: 'editor.token_unknown: {nonsense}',
                broken: true,
            },
        );
    });
});

describe('insertChoices', () => {
    it('offers the nameable spaces and the words, filtered by name or kind', () => {
        const all = insertChoices(resolved, '', t);

        expect(all.items.some((item) => item.name === 'Kroonplein')).toBe(true);
        expect(all.words).toHaveLength(5);
        expect(all.wordKind).toBe('editor.token_word');

        const kroon = insertChoices(resolved, ' KROON ', t);

        expect(kroon.items.map((item) => item.name)).toEqual(['Kroonplein']);
        expect(kroon.words).toEqual([]);

        expect(insertChoices(resolved, 'token_word', t).words).toHaveLength(5);
    });
});

describe('parseOnly', () => {
    it('refuses plain text', () => {
        expect(() => parseOnly('tekst')).toThrow(RangeError);
    });
});
