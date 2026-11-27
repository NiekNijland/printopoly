import { standardEdition } from '@/lib/render/standard-edition';
import type { Locale } from '@/types/game';

import {
    DEFAULT_WORDS,
    bookletPages,
    type RulesContext,
} from './rules-booklet';

const contextFor = (locale: Locale): RulesContext => ({
    locale,
    currency: 'eur',
    name: 'Club',
    words: DEFAULT_WORDS[locale],
    spaceNames: standardEdition.spaces.map((space) => space.name[locale]),
    houseRules: [],
});

describe('bookletPages', () => {
    it.each(['nl', 'en'] as const)(
        'gives sixteen pages in %s, from cover to back',
        (locale) => {
            const pages = bookletPages(contextFor(locale));

            expect(pages).toHaveLength(16);
            expect(pages[0]?.kind).toBe('cover');
            expect(pages[15]?.kind).toBe('back');
            expect(pages.filter((page) => page.kind === 'prices')).not.toEqual(
                [],
            );
            expect(
                pages.filter((page) => page.kind === 'houseRules'),
            ).toHaveLength(1);
            expect(pages.filter((page) => page.kind === 'notes')).toHaveLength(
                1,
            );
        },
    );

    it('writes the Dutch text for nl and the English text for en', () => {
        const dutch = bookletPages(contextFor('nl'));
        const english = bookletPages(contextFor('en'));
        const kickers = (pages: ReturnType<typeof bookletPages>) =>
            pages.flatMap((page) => ('kicker' in page ? [page.kicker] : []));

        expect(dutch[0]).toMatchObject({
            title: 'Club',
            subtitle: 'Spelregels',
        });
        expect(english[0]).toMatchObject({
            title: 'Club',
            subtitle: 'How to play',
        });
        expect(kickers(dutch)).toContain('Onze afspraken');
        expect(kickers(english)).toContain('Our agreements');
        expect(kickers(english)).not.toContain('Onze afspraken');
    });

    it('lists the house rules of the edition on their page', () => {
        const pages = bookletPages({
            ...contextFor('en'),
            houseRules: ['No deals at night'],
        });

        expect(pages.find((page) => page.kind === 'houseRules')).toMatchObject({
            rules: ['No deals at night'],
        });
    });
});

describe('DEFAULT_WORDS', () => {
    it('names the pieces in each language', () => {
        expect(DEFAULT_WORDS.nl).toMatchObject({
            house: 'huisje',
            jail: 'de gevangenis',
            chest: 'Algemeen Fonds',
        });
        expect(DEFAULT_WORDS.en).toMatchObject({
            house: 'house',
            jail: 'jail',
            chest: 'Community Chest',
        });
    });

    it('holds the same words in both languages', () => {
        expect(Object.keys(DEFAULT_WORDS.en).sort()).toEqual(
            Object.keys(DEFAULT_WORDS.nl).sort(),
        );
    });
});
