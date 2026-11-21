import { describe, expect, it } from 'vitest';

import { resolveEdition } from '@/lib/edition/resolve';
import { makeEdition } from '@/lib/edition/test-utils';
import type { Edition } from '@/lib/edition/types';

import { BOOKLET_TITLE_BOX, NOTE_NAME_BOX, fitsNameBox } from './name-boxes';
import { bookletPages, type PriceListPage } from './rules-booklet';
import { rulesContext } from './rules-context';

function withElements(
    edition: Edition,
    elements: Edition['elements'],
): Edition {
    return { ...edition, elements: { ...edition.elements, ...elements } };
}

function textOf(edition: Edition, money?: 'four' | 'eight' | 'full') {
    const pages = bookletPages(
        rulesContext(resolveEdition(edition), undefined, money),
    );

    return { pages, text: JSON.stringify(pages) };
}

describe('the rules booklet in the words of the edition', () => {
    it('uses the own currency sign in the amounts and the price list (bug 7 of test round 3)', () => {
        const edition = withElements(makeEdition(), {
            'words.currency': { name: 'Korfbalpunten', text: 'KP' },
        });
        const { pages, text } = textOf(edition);
        const prices = pages.find(
            (page): page is PriceListPage => page.kind === 'prices',
        );

        expect(text).toContain('KP 1.500');
        expect(text).not.toContain('€');
        expect(prices?.heads.price).toBe('Prijs KP');
    });

    it('uses all own words: jail, decks, corners and the hotel column (bug 17 of test round 3)', () => {
        const edition = withElements(makeEdition({ language: 'en' }), {
            'words.jail': { name: 'the clink' },
            'words.chance': { name: 'Lucky Dip' },
            'words.chest': { name: 'Kitty' },
            'words.hotel': { name: 'castle', text: 'castles' },
            'space.20': { name: 'Tea Break' },
            'space.30': { name: 'Off to the Clink' },
        });
        const { pages, text } = textOf(edition);
        const prices = pages.find(
            (page): page is PriceListPage => page.kind === 'prices',
        );

        expect(text).toContain('straight to the clink');
        expect(text).toContain('“Off to the Clink”');
        expect(text).toContain('On Tea Break nothing happens');
        expect(text).toContain('16 Lucky Dip cards and 16 Kitty cards');
        expect(text).not.toMatch(/\bjail\b/);
        expect(text).not.toContain('Chance');
        expect(prices?.heads.hotel).toBe('Castle');
        expect(
            pages.map((page) => ('title' in page ? page.title : '')),
        ).toContain('The clink');
    });

    it('names stations and utilities as the edition does, also in the price list (B172)', () => {
        const edition = withElements(makeEdition(), {
            'words.station': { name: 'bushalte', text: 'bushaltes' },
            'words.utility': { name: 'kantine', text: 'kantines' },
        });
        const { pages, text } = textOf(edition);
        const prices = pages.filter(
            (page): page is PriceListPage => page.kind === 'prices',
        );

        expect(text).toContain('Bushaltes en kantines');
        expect(text).toContain('bij 1, 2, 3 of 4 bushaltes');
        expect(text).toContain('Kantine: keer de ogen bij 1 / 2 kantines.');
        expect(text).not.toMatch(/[Ss]tations|[Nn]utsbedrij/);
        expect(JSON.stringify(prices)).toContain('"Bushaltes"');
        expect(JSON.stringify(prices)).toContain('"Kantines"');
    });

    it('keeps the standard Dutch sentences with the article of the jail', () => {
        const { text } = textOf(makeEdition());

        expect(text).toContain('dan ga je meteen naar de gevangenis.');
        expect(text).toContain('“Ga naar de gevangenis”');
    });

    it('says how much money is in the box and for how many players (B156)', () => {
        const four = textOf(makeEdition(), 'four').text;
        const eight = textOf(makeEdition(), 'eight').text;

        expect(four).toContain(
            'speelgeld voor 2 tot 4 spelers (144 biljetten)',
        );
        expect(four).toContain('Je speelt met 2 tot 4 spelers');
        expect(eight).toContain(
            'speelgeld voor 2 tot 8 spelers (258 biljetten)',
        );
        expect(eight).toContain('Je speelt met 2 tot 8 spelers.');
        // Without play money in the set the booklet does not count notes.
        expect(textOf(makeEdition()).text).not.toContain('biljetten');
    });
});

describe('the edition name in its boxes (bug 14 of test round 3)', () => {
    it('fits a long name by wrapping it, and only fails on a very long word', () => {
        const long =
            'Familie Van der Meulen-Jansen Kerstspel 2026 en nog een hele zin erachter';

        expect(fitsNameBox(`Welkom bij ${long}`, BOOKLET_TITLE_BOX).fits).toBe(
            true,
        );
        expect(fitsNameBox(long, NOTE_NAME_BOX).fits).toBe(true);
        expect(fitsNameBox('Œ'.repeat(70), NOTE_NAME_BOX).fits).toBe(false);
    });
});
