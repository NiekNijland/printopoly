import { describe, expect, it } from 'vitest';

import { standardEdition } from '@/lib/game/standard-edition';
import { deedContent } from '@/lib/render/deed-rows';

import { setElement } from './changes';
import { parseKey, wordKey, WORD_IDS } from './keys';
import { resolveEdition } from './resolve';
import { parseEdition, parseOverride } from './schema';
import { makeEdition } from './test-utils';
import type { Edition } from './types';
import {
    cornerKey,
    defaultWords,
    fillWords,
    renderWords,
    resolveWords,
} from './words';

function withWords(
    edition: Edition,
    words: Record<string, { name?: string; text?: string }>,
): Edition {
    return Object.entries(words).reduce(
        (current, [key, override]) =>
            setElement(current, key, override).edition,
        edition,
    );
}

describe('resolveWords', () => {
    it('is the standard words of the language when nothing is set', () => {
        const nl = resolveWords(makeEdition({ language: 'nl' }));
        const en = resolveWords(makeEdition({ language: 'en' }));

        expect(nl.house).toEqual({ singular: 'huis', plural: 'huizen' });
        expect(nl.hotel.singular).toBe('hotel');
        expect(nl.jail).toBe('de gevangenis');
        expect(nl.decks).toEqual({
            chance: 'Kans',
            chest: 'Algemeen Fonds',
        });
        expect(nl.currencySymbol).toBe('€');
        expect(en.house.plural).toBe('houses');
        expect(en.decks.chest).toBe('Community Chest');
        expect(en.currencyName).toBe('Play money (M)');
        expect(Object.values(nl.custom).some(Boolean)).toBe(false);
        expect(nl.customSymbol).toBeUndefined();
        expect(defaultWords(makeEdition())).toEqual(nl);
    });

    it('takes the words of the edition, trimmed, and flags what is custom', () => {
        const words = resolveWords(
            withWords(makeEdition(), {
                [wordKey('house')]: { name: ' Schuurtje ', text: 'Schuurtjes' },
                [wordKey('hotel')]: { name: 'Boerderij' },
                [wordKey('chance')]: { name: 'Roddel' },
                [wordKey('currency')]: { name: 'Raalter pegels', text: 'RP' },
                [wordKey('jail')]: { name: 'de Strafbank' },
            }),
        );

        expect(words.house).toEqual({
            singular: 'Schuurtje',
            plural: 'Schuurtjes',
        });
        // A plural that is left empty is the singular, so one filled field is already usable.
        expect(words.hotel).toEqual({
            singular: 'Boerderij',
            plural: 'Boerderij',
        });
        expect(words.decks).toEqual({
            chance: 'Roddel',
            chest: 'Algemeen Fonds',
        });
        expect(words.currencyName).toBe('Raalter pegels');
        expect(words.currencySymbol).toBe('RP');
        expect(words.customSymbol).toBe('RP');
        expect(words.jail).toBe('de Strafbank');
        expect(words.custom).toEqual({
            house: true,
            hotel: true,
            jail: true,
            currency: true,
            chance: true,
            chest: false,
        });
    });

    it('treats a field with only spaces as empty', () => {
        const words = resolveWords(
            withWords(makeEdition(), { [wordKey('house')]: { name: '   ' } }),
        );

        expect(words.house.singular).toBe('huis');
        expect(words.custom.house).toBe(false);
    });

    it('leaves the symbol of the currency alone when only the name is set', () => {
        const words = resolveWords(
            withWords(makeEdition(), {
                [wordKey('currency')]: { name: 'Pegels' },
            }),
        );

        expect(words.currencySymbol).toBe('€');
        expect(words.customSymbol).toBeUndefined();
        expect(renderWords(words).currencySymbol).toBeUndefined();
    });
});

describe('fillWords', () => {
    it('fills every placeholder of a card text', () => {
        const words = resolveWords(makeEdition());

        expect(
            fillWords('{house}, {houses}, {hotel}, {hotels}, {jail}', words),
        ).toBe('huis, huizen, hotel, hotels, de gevangenis');
        expect(fillWords('Geen placeholders', words)).toBe('Geen placeholders');
    });
});

describe('the words in the resolved edition', () => {
    it('puts the custom words in the standard card texts, in both languages', () => {
        const custom = {
            [wordKey('house')]: { name: 'schuurtje' },
            [wordKey('hotel')]: { name: 'boerderij' },
            [wordKey('jail')]: { name: 'de Strafbank' },
        };
        const nl = resolveEdition(withWords(makeEdition(), custom));
        const en = resolveEdition(
            withWords(makeEdition({ language: 'en' }), {
                ...custom,
                [wordKey('jail')]: { name: 'the Pit' },
            }),
        );

        expect(nl.decks?.chance[10]?.text).toBe(
            'Je gebouwen moeten worden onderhouden: betaal € 25 per schuurtje en € 100 per boerderij.',
        );
        expect(nl.decks?.chest[13]?.text).toBe(
            'De straat wordt opgebroken: betaal € 40 per schuurtje en € 115 per boerderij.',
        );
        expect(nl.decks?.chance[9]?.text).toBe(
            'Ga meteen naar de Strafbank. Je komt niet langs Start en krijgt niets.',
        );
        expect(en.decks?.chance[10]?.text).toBe(
            'Your buildings need upkeep: pay M25 per schuurtje and M100 per boerderij.',
        );
        expect(en.decks?.chest[5]?.text).toBe(
            'Go straight to the Pit. No Start, no M200.',
        );
    });

    it('keeps the reference text standard, so the editor still shows the original (B32)', () => {
        const edition = withWords(makeEdition(), {
            [wordKey('house')]: { name: 'schuurtje' },
        });
        const card = resolveEdition(edition).decks?.chance[10];

        expect(card?.originalText).toContain('per huis en € 100 per hotel');
        expect(card?.text).toContain('per schuurtje');
        expect(card?.originalText).not.toContain('{');
    });

    it('leaves no placeholder in any standard text, with or without custom words', () => {
        for (const language of ['nl', 'en'] as const) {
            const resolved = resolveEdition(makeEdition({ language }));
            const cards = [
                ...(resolved.decks?.chance ?? []),
                ...(resolved.decks?.chest ?? []),
            ];

            expect(cards).toHaveLength(32);
            for (const card of cards) {
                expect(card.text).not.toMatch(/[{}]/);
                expect(card.originalText).not.toMatch(/[{}]/);
            }
        }
    });

    it('does not touch a card text the edition wrote itself', () => {
        const edition = withWords(makeEdition(), {
            [wordKey('house')]: { name: 'schuurtje' },
            'card.chance.11': { text: 'Betaal per {house}.' },
        });

        expect(resolveEdition(edition).decks?.chance[10]?.text).toBe(
            'Betaal per {house}.',
        );
    });

    it('follows a renamed Start in the card texts', () => {
        const edition = withWords(makeEdition(), {
            [cornerKey('start')]: { name: 'Begin' },
        });

        expect(resolveEdition(edition).decks?.chance[0]?.text).toBe(
            'Draai om en loop recht naar Begin. Je krijgt € 200 van de bank.',
        );
    });

    it('gives the deck spaces on the board the name of the deck, unless the space has its own name', () => {
        const edition = withWords(makeEdition(), {
            [wordKey('chance')]: { name: 'Roddel' },
            [wordKey('chest')]: { name: 'Dorpskas' },
            'space.22': { name: 'Eigen Roddel' },
        });
        const { spaces } = resolveEdition(edition);

        expect(spaces[7]?.name).toBe('Roddel');
        expect(spaces[36]?.name).toBe('Roddel');
        expect(spaces[22]?.name).toBe('Eigen Roddel');
        expect(spaces[2]?.name).toBe('Dorpskas');
        expect(spaces[33]?.name).toBe('Dorpskas');
        expect(spaces[1]?.name).toBe('Molenweg');
    });

    it('gives the currency its own name and symbol, and keeps its id', () => {
        const edition = withWords(makeEdition(), {
            [wordKey('currency')]: { name: 'Raalter pegels', text: 'RP' },
        });
        const { currency, words } = resolveEdition(edition);

        expect(currency).toEqual({
            id: 'eur',
            symbol: 'RP',
            name: { nl: 'Raalter pegels', en: 'Raalter pegels' },
        });
        expect(words.currencySymbol).toBe('RP');
    });

    it('resolves the short text of a corner, and only for corners', () => {
        const edition = withWords(makeEdition(), {
            [cornerKey('start')]: { text: 'Pak 200 pegels bij de molen' },
            [cornerKey('jail')]: { text: '   ' },
        });
        const { spaces } = resolveEdition(edition);

        expect(spaces[0]?.text).toBe('Pak 200 pegels bij de molen');
        expect(spaces[10]?.text).toBeUndefined();
        expect(spaces[1]?.text).toBeUndefined();
    });

    it('counts the words as customised elements of the board', () => {
        const edition = withWords(makeEdition(), {
            [wordKey('house')]: { name: 'schuurtje' },
        });

        expect(resolveEdition(edition).customizedCount).toBe(1);
    });

    it('puts the words on the rent table of a deed', () => {
        const words = renderWords(
            resolveWords(
                withWords(makeEdition(), {
                    [wordKey('house')]: {
                        name: 'Schuurtje',
                        text: 'Schuurtjes',
                    },
                    [wordKey('hotel')]: { name: 'Boerderij' },
                    [wordKey('currency')]: { text: 'RP' },
                }),
            ),
        );
        const street = standardEdition.spaces[1];
        if (street?.type !== 'street') {
            throw new Error('Space 1 is a street');
        }
        const content = deedContent(street, 'nl', 'eur', words);

        expect(content.rows.map((row) => row.label)).toEqual([
            'Huur',
            'Hele kleur in bezit',
            'Met 1 Schuurtje',
            'Met 2 Schuurtjes',
            'Met 3 Schuurtjes',
            'Met 4 Schuurtjes',
            'Met Boerderij',
        ]);
        expect(content.rows[0]?.value).toBe('RP 2');
        expect(content.footer).toBe(
            'Schuurtje RP 50 · Boerderij RP 50 plus 4 Schuurtjes',
        );
    });
});

describe('keys and validation of the words', () => {
    it('knows the words keys and no others', () => {
        for (const id of WORD_IDS) {
            expect(parseKey(wordKey(id))).toEqual({
                kind: 'words',
                part: 'board',
            });
        }
        expect(parseKey('words.pawn')).toBeNull();
        expect(parseKey('words')).toBeNull();
        expect(parseKey('words.house.extra')).toBeNull();
    });

    it('accepts a name and a text, and nothing else, on a word', () => {
        const errors: string[] = [];

        expect(
            parseOverride(
                'words.house',
                { name: 'Schuurtje', text: 'Schuurtjes' },
                errors,
            ),
        ).toEqual({ name: 'Schuurtje', text: 'Schuurtjes' });
        expect(errors).toEqual([]);
        expect(
            parseOverride('words.house', { amount: 3 }, errors),
        ).toBeUndefined();
        expect(errors[0]).toContain('not allowed');
    });

    it('limits the length of words and symbols', () => {
        const errors: string[] = [];

        expect(
            parseOverride('words.hotel', { name: 'x'.repeat(41) }, errors),
        ).toBeUndefined();
        expect(
            parseOverride('words.currency', { text: 'ABCDEFG' }, errors),
        ).toBeUndefined();
        expect(parseOverride('words.currency', { text: 'ABCDEF' }, [])).toEqual(
            { text: 'ABCDEF' },
        );
        expect(errors).toHaveLength(2);
    });

    it('allows a text on a corner and refuses it on any other space', () => {
        const errors: string[] = [];

        expect(
            parseOverride('space.00', { text: 'Pak je salaris' }, errors),
        ).toEqual({
            text: 'Pak je salaris',
        });
        expect(
            parseOverride('space.30', { text: 'Rechtstreeks' }, errors),
        ).toEqual({
            text: 'Rechtstreeks',
        });
        expect(errors).toEqual([]);
        expect(
            parseOverride('space.01', { text: 'Nee' }, errors),
        ).toBeUndefined();
        expect(
            parseOverride('space.02', { text: 'Nee' }, errors),
        ).toBeUndefined();
        expect(errors).toEqual([
            'space.01.text: only a corner has a text',
            'space.02.text: only a corner has a text',
        ]);
    });

    it('keeps the words when an edition is read back', () => {
        const edition = withWords(makeEdition(), {
            [wordKey('house')]: { name: 'Schuurtje' },
            [cornerKey('start')]: { text: 'Pak je salaris' },
        });
        const parsed = parseEdition(JSON.parse(JSON.stringify(edition)));

        expect(parsed.ok).toBe(true);
        expect(parsed.ok ? parsed.value.elements : null).toEqual(
            edition.elements,
        );
    });
});
