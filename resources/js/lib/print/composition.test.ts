import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_PROFILE } from './board';
import { cardKeys, composePages, type PrintEdition } from './composition';

/** Only the overrides are stored (B59), so an edition without elements still has 60 cards. */
const edition: PrintEdition = { elements: {} };

/**
 * The page plan the PHP check (App\Print\PrintLayout) expects. The same table sits in
 * tests/Unit/Print/PrintLayoutTest.php: change both together.
 */
describe('composePages', () => {
    const plan = (
        part: Parameters<typeof composePages>[0],
        set: 'printer' | 'home',
    ) => {
        const pages = composePages(part, set, edition);
        const sizes = new Set(
            pages.map(
                (page) => `${String(page.size.w)}x${String(page.size.h)}`,
            ),
        );

        return { count: pages.length, sizes: [...sizes] };
    };

    it('puts the board on 4 panels for the print shop', () => {
        expect(plan('board', 'printer')).toEqual({
            count: 4,
            sizes: ['254x254'],
        });
    });

    it('packs the board stickers on 7 A4 sheets for home', () => {
        expect(plan('board', 'home')).toEqual({ count: 7, sizes: ['210x297'] });
    });

    it('gives each card two pages for the print shop and 4 cards per A4 sheet at home', () => {
        expect(plan('cards', 'printer')).toEqual({
            count: 120,
            sizes: ['69x94'],
        });
        expect(plan('cards', 'home')).toEqual({
            count: 15,
            sizes: ['297x210'],
        });
    });

    it('alternates front and back for the print shop', () => {
        const pages = composePages('cards', 'printer', edition);

        expect(pages.slice(0, 4).map((page) => page.items[0]?.side)).toEqual([
            'front',
            'back',
            'front',
            'back',
        ]);
        expect(pages[0]?.items[0]?.elementKey).toBe('deed.01');
    });

    it('prints 210 notes on 15 SRA3 or 35 A4 sheets', () => {
        expect(plan('money', 'printer')).toEqual({
            count: 15,
            sizes: ['320x450'],
        });
        expect(plan('money', 'home')).toEqual({
            count: 35,
            sizes: ['297x210'],
        });
    });

    it('puts the tokens, box lid and test sheet on their own pages', () => {
        expect(plan('tokens', 'printer')).toEqual({
            count: 1,
            sizes: ['297x210'],
        });
        expect(plan('box_lid', 'printer')).toEqual({
            count: 1,
            sizes: ['273x273'],
        });
        expect(plan('box_lid', 'home')).toEqual({
            count: 1,
            sizes: ['297x420'],
        });
        expect(plan('calibration', 'home')).toEqual({
            count: 1,
            sizes: ['210x297'],
        });
    });

    it('plans the extra print items: booklet, fold models, dice and invitation', () => {
        expect(plan('rules_booklet', 'printer')).toEqual({
            count: 16,
            sizes: ['154.5x216'],
        });
        expect(plan('rules_booklet', 'home')).toEqual({
            count: 8,
            sizes: ['297x210'],
        });
        expect(plan('fold_models', 'home')).toEqual({
            count: 3,
            sizes: ['210x297'],
        });
        expect(plan('dice', 'home')).toEqual({ count: 1, sizes: ['210x297'] });
        expect(plan('invitation', 'printer')).toEqual({
            count: 1,
            sizes: ['111x154'],
        });
        expect(plan('invitation', 'home')).toEqual({
            count: 1,
            sizes: ['210x297'],
        });
    });

    it('puts the booklet pages in the order that folds into a booklet', () => {
        const sides = composePages('rules_booklet', 'home', edition).map(
            (page) => page.items.map((item) => item.id),
        );

        expect(sides[0]).toEqual(['booklet.16', 'booklet.1']);
        expect(sides[1]).toEqual(['booklet.2', 'booklet.15']);
        expect(sides[7]).toEqual(['booklet.8', 'booklet.9']);
        expect(new Set(sides.flat()).size).toBe(16);
    });

    it('lists cards in deed, chance, chest order', () => {
        const keys = cardKeys(edition);

        expect(keys).toHaveLength(60);
        expect(keys[0]).toBe('deed.01');
        expect(keys[27]).toBe('deed.28');
        expect(keys[28]).toBe('card.chance.01');
        expect(keys[44]).toBe('card.chest.01');
    });

    it('prints only the deeds and decks that are switched on (B99)', () => {
        expect(
            cardKeys({ elements: {}, parts: { deeds: false } }),
        ).toHaveLength(32);
        expect(
            cardKeys({ elements: {}, parts: { cards: false } }),
        ).toHaveLength(28);
        expect(
            cardKeys({ elements: {}, parts: { deeds: false, cards: false } }),
        ).toHaveLength(0);
    });

    it('adds the house rules card after the decks, only when it is switched on (B99)', () => {
        expect(cardKeys({ elements: {} })).not.toContain('house_rules');
        expect(
            cardKeys({ elements: {}, parts: { houseRules: false } }),
        ).not.toContain('house_rules');

        const keys = cardKeys({ elements: {}, parts: { houseRules: true } });

        expect(keys).toHaveLength(61);
        expect(keys.at(-1)).toBe('house_rules');
        expect(
            composePages('cards', 'printer', {
                elements: {},
                parts: { houseRules: true },
            }),
        ).toHaveLength(122);
    });

    it('names each banknote by its note key, 30 of every value', () => {
        const keys = composePages('money', 'home', edition).flatMap((page) =>
            page.items.map((item) => item.elementKey),
        );

        expect(keys).toHaveLength(210);
        expect(keys[0]).toBe('note.1');
        expect(keys[30]).toBe('note.5');
        expect(keys[209]).toBe('note.500');
    });

    it('computes the home sheets from the board profile', () => {
        // The same numbers sit in PrintLayoutTest (HomeStickerPlan is the PHP port of the packing).
        const sheets = (outer: number, corner: number, border = 0) =>
            composePages(
                'board',
                'home',
                { elements: {} },
                { ...DEFAULT_BOARD_PROFILE, outer, corner, border },
            ).length;

        expect(sheets(500, 70)).toBe(7);
        expect(sheets(400, 60)).toBe(6);
        expect(sheets(450, 65, 5)).toBe(6);
    });

    it('uses the board profile of the edition', () => {
        const small = { ...DEFAULT_BOARD_PROFILE, outer: 400, corner: 60 };
        const pages = composePages('board', 'printer', { elements: {} }, small);

        expect(pages).toHaveLength(4);
        expect(pages[0]?.size).toEqual({ w: 204, h: 204 });
    });
});
