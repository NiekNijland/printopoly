import { DEFAULT_WORDS, type RulesContext } from './rules-booklet';
import { bookletFacts } from './rules-booklet-facts';
import { dutchPages } from './rules-booklet-nl';

const ctx: RulesContext = {
    locale: 'nl',
    currency: 'eur',
    name: 'Ons Dorp',
    words: DEFAULT_WORDS.nl,
    spaceNames: [],
    houseRules: ['Geen geld op Vrij parkeren'],
};

describe('dutchPages', () => {
    it('writes the sixteen pages from the cover to the back', () => {
        const pages = dutchPages(ctx, bookletFacts(ctx));

        expect(pages).toHaveLength(16);
        expect(pages.map((page) => page.kind)).toEqual([
            'cover',
            ...Array<string>(10).fill('text'),
            'prices',
            'prices',
            'houseRules',
            'notes',
            'back',
        ]);
        expect(pages[0]).toMatchObject({ subtitle: 'Spelregels' });
    });

    it('carries the house rules of the edition', () => {
        const pages = dutchPages(ctx, bookletFacts(ctx));

        expect(pages[13]).toMatchObject({
            rules: ['Geen geld op Vrij parkeren'],
        });
    });
});
