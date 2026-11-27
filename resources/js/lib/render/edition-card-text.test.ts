import { describe, expect, it } from 'vitest';
import { makeEdition } from '../../testing/edition-test-utils';
import {
    cardTextContext,
    mapCardTextSegments,
    parseCardText,
    renderCardText,
} from './edition-card-text';
import { updateElement } from './edition-changes';

describe('parseCardText', () => {
    it('splits text and tokens', () => {
        expect(
            parseCardText('Ga naar {space:24}, {currency}{amount}.'),
        ).toEqual([
            { type: 'text', text: 'Ga naar ' },
            { type: 'space', position: 24 },
            { type: 'text', text: ', ' },
            { type: 'currency' },
            { type: 'amount' },
            { type: 'text', text: '.' },
        ]);
    });

    it('treats tokens it does not know as unknown, with the raw text', () => {
        expect(
            parseCardText('{foo} {space:99} {space:07} {space:x} {currency:1}'),
        ).toEqual([
            { type: 'unknown', raw: '{foo}' },
            { type: 'text', text: ' ' },
            { type: 'unknown', raw: '{space:99}' },
            { type: 'text', text: ' ' },
            { type: 'unknown', raw: '{space:07}' },
            { type: 'text', text: ' ' },
            { type: 'unknown', raw: '{space:x}' },
            { type: 'text', text: ' ' },
            { type: 'unknown', raw: '{currency:1}' },
        ]);
    });

    it('knows the words of an edition as variables, singular and plural (B177)', () => {
        expect(
            parseCardText('{station} {stations} {utility} {jail} {station:1}'),
        ).toEqual([
            { type: 'word', word: 'station' },
            { type: 'text', text: ' ' },
            { type: 'word', word: 'stations' },
            { type: 'text', text: ' ' },
            { type: 'word', word: 'utility' },
            { type: 'text', text: ' ' },
            { type: 'word', word: 'jail' },
            { type: 'text', text: ' ' },
            { type: 'unknown', raw: '{station:1}' },
        ]);
        const edition = makeEdition();
        expect(
            renderCardText(
                'Naar het dichtstbijzijnde {station}, {utility} of {jail}.',
                cardTextContext(edition, undefined),
            ),
        ).toBe(
            'Naar het dichtstbijzijnde station, nutsbedrijf of de gevangenis.',
        );
        expect(
            renderCardText(
                'Langs alle {stations}.',
                cardTextContext(edition, undefined, undefined, {
                    house: { singular: 'hut', plural: 'hutten' },
                    hotel: { singular: 'kasteel', plural: 'kastelen' },
                    station: { singular: 'bushalte', plural: 'bushaltes' },
                    utility: { singular: 'fabriek', plural: 'fabrieken' },
                    jail: 'de strafbank',
                }),
            ),
        ).toBe('Langs alle bushaltes.');
    });

    it('leaves braces that do not look like a token as text', () => {
        expect(parseCardText('{ } {} {Naam} { space:1 }')).toEqual([
            { type: 'text', text: '{ } {} {Naam} { space:1 }' },
        ]);
    });

    it('round-trips every string', () => {
        for (const text of [
            '',
            'gewoon',
            '{space:0}{space:0}',
            '{x}{space:12}\n{amount}',
            '{{space:3}}',
            '{space:07}',
        ]) {
            expect(mapCardTextSegments(text, (plain) => plain)).toBe(text);
        }
    });
});

describe('renderCardText', () => {
    const edition = makeEdition({ language: 'nl' });

    it('fills in the current name, the currency and the amount', () => {
        const { edition: renamed } = updateElement(edition, 'space.24', {
            name: 'Jalinkhof',
        });

        expect(
            renderCardText(
                'Naar {space:24} voor {currency}{amount}.',
                cardTextContext(renamed, 50),
            ),
        ).toBe('Naar Jalinkhof voor €50.');
    });

    it('puts the currency before an {amount} that has none, with the own symbol (round 4, bug 4)', () => {
        const { edition: ducats } = updateElement(edition, 'words.currency', {
            text: 'dk',
        });

        expect(
            renderCardText(
                'Een storm! Betaal {amount} voor de reparatie.',
                cardTextContext(ducats, -50, 'dk'),
            ),
        ).toBe('Een storm! Betaal dk\u00a050 voor de reparatie.');
        expect(
            renderCardText(
                'Pay {amount}',
                cardTextContext(makeEdition({ language: 'en' }), 15),
            ),
        ).toBe('Pay £15');
    });

    it('keeps one currency sign when the text already has one before {amount}', () => {
        expect(
            renderCardText(
                'Betaal {currency} {amount} of € {amount}.',
                cardTextContext(edition, 50),
            ),
        ).toBe('Betaal €\u00a050 of € 50.');
    });

    it('follows a swap of two names without renaming twice', () => {
        let swapped = updateElement(edition, 'space.24', {
            name: 'Kroonplein',
        }).edition;
        swapped = updateElement(swapped, 'space.39', {
            name: 'Raadhuisplein',
        }).edition;

        expect(
            renderCardText(
                '{space:24} en {space:39}',
                cardTextContext(swapped, undefined),
            ),
        ).toBe('Kroonplein en Raadhuisplein');
    });

    it('shows what it cannot fill in as typed', () => {
        expect(
            renderCardText(
                '{foo} {amount} {space:99}',
                cardTextContext(edition, undefined),
            ),
        ).toBe('{foo} {amount} {space:99}');
    });

    it('writes the article of a name in sentence case small in the middle of a sentence (R6 Tom)', () => {
        let named = makeEdition({ language: 'en' });
        named = updateElement(named, 'space.24', {
            name: 'The wedding car',
        }).edition;
        named = updateElement(named, 'space.39', {
            name: 'The champagne',
        }).edition;
        const context = cardTextContext(named, undefined);

        expect(renderCardText('Go to {space:24} or {space:39}.', context)).toBe(
            'Go to the wedding car or the champagne.',
        );
        // At the start of a sentence the capital stays.
        expect(renderCardText('{space:24} is waiting.', context)).toBe(
            'The wedding car is waiting.',
        );
        expect(renderCardText('Lucky you! {space:39} is free.', context)).toBe(
            'Lucky you! The champagne is free.',
        );
    });

    it('keeps the capital of a proper name with an article, in Dutch and English', () => {
        let named = makeEdition({ language: 'nl' });
        named = updateElement(named, 'space.24', {
            name: 'De Smederij',
        }).edition;
        named = updateElement(named, 'space.39', {
            name: 'De proeverij',
        }).edition;
        named = updateElement(named, 'space.37', {
            name: 'Het dorpshuis',
        }).edition;
        named = updateElement(named, 'space.11', { name: 'The Hague' }).edition;
        const context = cardTextContext(named, undefined);

        expect(
            renderCardText(
                'Trakteer bij {space:24}, ga naar {space:39}, {space:37} en {space:11}.',
                context,
            ),
        ).toBe(
            'Trakteer bij De Smederij, ga naar de proeverij, het dorpshuis en The Hague.',
        );
        // "Theater" and "Dekker" start with the letters of an article but are no article.
        named = updateElement(named, 'space.24', {
            name: 'Theaterplein',
        }).edition;
        named = updateElement(named, 'space.39', {
            name: 'Dekkerstraat',
        }).edition;
        expect(
            renderCardText(
                'Naar {space:24} en {space:39}',
                cardTextContext(named, undefined),
            ),
        ).toBe('Naar Theaterplein en Dekkerstraat');
    });

    it('falls back to the standard name for an empty name', () => {
        const { edition: blank } = updateElement(edition, 'space.24', {
            name: '  ',
        });

        expect(renderCardText('{space:24}', cardTextContext(blank, 0))).toBe(
            'Raadhuisplein',
        );
    });
});
