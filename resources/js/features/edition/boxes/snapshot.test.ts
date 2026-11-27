import { sampleEdition } from '@/testing/editions';

import { buildSnapshot, editionFromSnapshot } from './snapshot';
import type { BoxSnapshot } from './types';

const snapshot = (overrides: Partial<BoxSnapshot> = {}): BoxSnapshot => ({
    theme: 'riso',
    currency: 'gbp',
    parts: { cards: true, pawns: false },
    elements: {},
    ...overrides,
});

describe('buildSnapshot', () => {
    it('keeps the theme, the currency and whether cards and pawns are in the set', () => {
        const edition = sampleEdition({
            theme: 'gala',
            currency: 'usd',
            parts: { cards: false, pawns: true },
        });

        expect(buildSnapshot(edition)).toEqual({
            theme: 'gala',
            currency: 'usd',
            parts: { cards: false, pawns: true },
            elements: {},
        });
    });

    it('keeps pawn names and only words with something in them', () => {
        const edition = sampleEdition();
        edition.elements = {
            'pawn.01': { name: 'Fiets' },
            'pawn.02': { name: ' ' },
            'words.house': { name: '', text: 'Hutjes' },
            'words.hotel': { name: ' ', text: '' },
            'group.red': { town: '  ' },
            'card.chance.02': { amount: 10 },
            'space.03': { text: 'geen naam' },
        };

        expect(buildSnapshot(edition).elements).toEqual({
            'pawn.01': { name: 'Fiets' },
            'words.house': { text: 'Hutjes' },
        });
    });
});

describe('editionFromSnapshot', () => {
    it('turns the snapshot into an edition with the board and the chosen parts', () => {
        const edition = editionFromSnapshot(
            snapshot({ elements: { 'space.01': { name: 'Molenweg' } } }),
            { name: 'Club', language: 'en' },
        );

        expect(edition).toMatchObject({
            id: 'box-snapshot',
            name: 'Club',
            language: 'en',
            theme: 'riso',
            currency: 'gbp',
            elements: { 'space.01': { name: 'Molenweg' } },
        });
        expect(edition.parts).toMatchObject({
            board: true,
            deeds: false,
            cards: true,
            pawns: false,
            money: false,
        });
    });

    it('falls back to the classic theme and the currency of the language', () => {
        const nl = editionFromSnapshot(
            snapshot({ theme: 'neon', currency: 'yen' }),
            { name: 'Club', language: 'nl' },
        );
        const en = editionFromSnapshot(snapshot({ currency: null }), {
            name: 'Club',
            language: 'en',
        });

        expect(nl.theme).toBe('classic');
        expect(nl.currency).toBe('eur');
        expect(en.currency).toBe('gbp');
    });

    it('does not share the elements with the snapshot', () => {
        const source = snapshot({ elements: { 'pawn.01': { name: 'A' } } });

        const edition = editionFromSnapshot(source, {
            name: 'Club',
            language: 'nl',
        });
        edition.elements['pawn.02'] = { name: 'B' };

        expect(source.elements).toEqual({ 'pawn.01': { name: 'A' } });
    });
});
