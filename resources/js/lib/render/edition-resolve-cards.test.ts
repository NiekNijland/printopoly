import { describe, expect, it } from 'vitest';
import { standardEdition } from '@/lib/render/standard-edition';
import { makeEdition } from '../../testing/edition-test-utils';
import { updateElement } from './edition-changes';
import { deckCards } from './edition-resolve-cards';
import type { Edition } from './edition-types';
import { defaultWords, resolveWords } from './edition-words';

const withOverride = (
    edition: Edition,
    key: string,
    patch: Parameters<typeof updateElement>[2],
): Edition => updateElement(edition, key, patch).edition;

const cardsOf = (edition = makeEdition()) =>
    deckCards(
        edition,
        standardEdition,
        'chance',
        resolveWords(edition, standardEdition),
        defaultWords(edition, standardEdition),
    );

describe('deckCards', () => {
    it('resolves the standard cards of a deck in order', () => {
        const cards = cardsOf();

        expect(cards.map((card) => card.id)).toEqual(
            standardEdition.decks.chance.map((card) => card.id),
        );
        expect(cards.every((card) => !card.extra)).toBe(true);
    });

    it('adds an extra card after the standard ones, empty and without a standard amount (B135)', () => {
        const edition = withOverride(makeEdition(), 'card.chance.17', {
            added: true,
        });
        const extra = cardsOf(edition).at(-1);

        expect(extra?.id).toBe('chance.17');
        expect(extra?.extra).toBe(true);
        expect(extra?.text).toBe('');
        expect(extra?.standardAmount).toBeUndefined();
    });

    it('takes an own text and a trimmed purpose', () => {
        const edition = withOverride(makeEdition(), 'card.chance.01', {
            text: 'Eigen tekst',
            purpose: '  ',
        });
        const [first] = cardsOf(edition);

        expect(first?.template).toBe('Eigen tekst');
        expect(first?.text).toBe('Eigen tekst');
        expect(first?.customized).toBe(true);
        expect(first?.purpose).toBeUndefined();
    });

    it('leaves the amount line out when the text holds the amount', () => {
        const extra = (text: string) =>
            cardsOf(
                withOverride(makeEdition(), 'card.chance.17', {
                    added: true,
                    text,
                    amount: -50,
                }),
            ).at(-1);

        expect(extra('Betaal {amount}')?.amount).toBe(-50);
        expect(extra('Betaal {amount}')?.lineAmount).toBeUndefined();
        expect(extra('Een storm')?.lineAmount).toBe(-50);
    });
});
