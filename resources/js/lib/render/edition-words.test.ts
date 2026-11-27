import { describe, expect, it } from 'vitest';
import { makeEdition } from '../../testing/edition-test-utils';
import { setElement } from './edition-changes';
import { parseKey, wordKey, WORD_IDS } from './edition-keys';
import { parseEdition, parseOverride } from './edition-schema';
import type { Edition } from './edition-types';
import {
    cornerKey,
    defaultWords,
    fillWords,
    renderWords,
    resolveWords,
} from './edition-words';

const withWords = (
    edition: Edition,
    words: Record<string, { name?: string; text?: string }>,
): Edition => {
    return Object.entries(words).reduce(
        (current, [key, override]) =>
            setElement(current, key, override).edition,
        edition,
    );
};

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
        expect(en.currencyName).toBe('Pound');
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
            bank: false,
            station: false,
            utility: false,
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
