import { DEFAULT_WORDS, type RulesContext } from './rules-booklet';
import { priceList } from './rules-booklet-prices';

const ctx: RulesContext = {
    locale: 'nl',
    currency: 'eur',
    name: 'Ons Dorp',
    words: DEFAULT_WORDS.nl,
    spaceNames: [],
    houseRules: [],
    groupTowns: { brown: 'Ons stadje' },
};

describe('priceList', () => {
    it('heads the columns with the sign and the word for a hotel', () => {
        const page = priceList(ctx, 'k', 't', ['brown'], 'n');

        expect(page.heads.price).toBe('Prijs €');
        expect(page.heads.hotel).toBe('Hotel');
        expect(page.groups[0]?.label).toBe('Ons stadje');
        expect(page.groups[0]?.rows).toHaveLength(2);
    });

    it('lists the stations and utilities with their own rents', () => {
        const page = priceList(ctx, 'k', 't', ['station', 'utility'], 'n');
        const [station, utility] = page.groups;

        expect(station?.label).toBe('Stations');
        expect(station?.rows[0]?.rent.split(' / ')).toHaveLength(4);
        expect(utility?.rows[0]?.rent).toMatch(/×/);
        expect(utility?.rows[0]?.hotel).toBe('');
    });
});
