import { DEFAULT_WORDS, type RulesContext } from './rules-booklet';
import { englishPages } from './rules-booklet-en';
import { bookletFacts } from './rules-booklet-facts';

const ctx: RulesContext = {
    locale: 'en',
    currency: 'eur',
    name: 'Ons Dorp',
    words: DEFAULT_WORDS.en,
    spaceNames: [],
    houseRules: ['Geen geld op Vrij parkeren'],
};

describe('englishPages', () => {
    it('writes the sixteen pages from the cover to the back', () => {
        const pages = englishPages(ctx, bookletFacts(ctx));

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
        expect(pages[0]).toMatchObject({ subtitle: 'How to play' });
    });

    it('carries the house rules of the edition', () => {
        const pages = englishPages(ctx, bookletFacts(ctx));

        expect(pages[13]).toMatchObject({
            rules: ['Geen geld op Vrij parkeren'],
        });
    });
});
