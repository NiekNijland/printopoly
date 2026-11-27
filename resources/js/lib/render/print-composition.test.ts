import { describe, expect, it } from 'vitest';
import { defined } from '@/testing/defined';
import { DEFAULT_BOARD_PROFILE } from './print-board';
import {
    alignmentTargets,
    composePages,
    type PrintEdition,
} from './print-composition';
import { BLEED } from './print-page-frame';

/** Only the overrides are stored (B59), so an edition without elements still has 60 cards. */
const edition: PrintEdition = { elements: {} };

const cardKeys = (printed: PrintEdition): (string | null)[] =>
    composePages('cards', 'printer', printed)
        .flatMap((page) => page.items)
        .filter((item) => item.side === 'front')
        .map((item) => item.elementKey);

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

    // Print-shop pages with bleed get 6 mm around the bleed for the crop marks (B160).
    it('puts the board on 4 panels for the print shop', () => {
        expect(plan('board', 'printer')).toEqual({
            count: 4,
            sizes: ['266x266'],
        });
    });

    it('draws crop marks outside the bleed of every print-shop page with bleed (B160)', () => {
        for (const part of [
            'board',
            'cards',
            'box_lid',
            'rules_booklet',
            'invitation',
        ] as const) {
            for (const page of composePages(part, 'printer', edition)) {
                const item = defined(page.items[0]);

                expect(page.cropMarks).toHaveLength(8);
                expect(item.trim.x).toBe(6 + BLEED);
                expect(item.bleed.x).toBe(6);

                for (const mark of page.cropMarks) {
                    const outside = (v: number, lo: number, hi: number) =>
                        v <= lo - BLEED + 1e-9 || v >= hi + BLEED - 1e-9;
                    // Every mark lies outside the bleed and inside the page.
                    expect(
                        (outside(
                            mark.x1,
                            item.trim.x,
                            item.trim.x + item.trim.w,
                        ) &&
                            outside(
                                mark.x2,
                                item.trim.x,
                                item.trim.x + item.trim.w,
                            )) ||
                            (outside(
                                mark.y1,
                                item.trim.y,
                                item.trim.y + item.trim.h,
                            ) &&
                                outside(
                                    mark.y2,
                                    item.trim.y,
                                    item.trim.y + item.trim.h,
                                )),
                    ).toBe(true);
                    expect(Math.max(mark.x1, mark.x2)).toBeLessThan(
                        page.size.w,
                    );
                    expect(Math.min(mark.x1, mark.x2)).toBeGreaterThan(0);
                }
            }
        }
    });

    it('packs the board stickers on 7 A4 sheets for home', () => {
        expect(plan('board', 'home')).toEqual({ count: 7, sizes: ['210x297'] });
    });

    it('gives each card two pages for the print shop and 9 cards per A4 sheet, both sides, at home', () => {
        expect(plan('cards', 'printer')).toEqual({
            count: 120,
            sizes: ['81x106'],
        });
        expect(plan('cards', 'home')).toEqual({
            count: 16,
            sizes: ['210x297'],
        });
    });

    it('starts the home cards with the alignment test, then fronts and mirrored backs (B134)', () => {
        const pages = composePages('cards', 'home', edition);

        expect(pages.slice(0, 2).map((page) => page.items[0]?.kind)).toEqual([
            'alignment',
            'alignment',
        ]);
        expect(pages.slice(2).map((page) => page.items[0]?.side)).toEqual(
            Array.from({ length: 14 }, (_, i) =>
                i % 2 === 0 ? 'front' : 'back',
            ),
        );

        for (let p = 2; p < pages.length; p += 2) {
            const front = defined(pages[p]);
            const back = defined(pages[p + 1]);

            expect(back.items.map((item) => item.elementKey)).toEqual(
                front.items.map((item) => item.elementKey),
            );
            back.items.forEach((item, i) => {
                const twin = defined(front.items[i]);

                // Turned over the long edge, the back lies exactly behind its front.
                expect(item.trim.x).toBeCloseTo(
                    210 - twin.trim.x - twin.trim.w,
                    9,
                );
                expect(item.trim.y).toBeCloseTo(twin.trim.y, 9);
                expect(item.bleed.x).toBeCloseTo(
                    210 - twin.bleed.x - twin.bleed.w,
                    9,
                );
            });
        }

        // The last sheet has 6 cards: the backs fill the mirrored slots, right to left.
        const lastFront = defined(pages.at(-2));
        const lastBack = defined(pages.at(-1));

        expect(lastFront.items).toHaveLength(6);
        expect(defined(lastBack.items[0]).trim.x).toBeGreaterThan(
            defined(lastFront.items[0]).trim.x,
        );
        expect(lastFront.label).toBe('Kaarten 55 t/m 60, voorkant');
        expect(lastBack.label).toBe('Kaarten 55 t/m 60, achterkant');
    });

    it('puts the alignment crosshairs where the cards are, mirrored on the back', () => {
        const front = alignmentTargets('front');
        const back = alignmentTargets('back');

        expect(front).toHaveLength(5);
        back.forEach((point, i) => {
            expect(point.x).toBeCloseTo(210 - defined(front[i]).x, 9);
            expect(point.y).toBeCloseTo(defined(front[i]).y, 9);
        });
        expect(front[2]).toEqual({ x: 105, y: 148.5 });
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

    it('prints the full bank (306 notes) on 22 SRA3 and 2 to 4 players (144 notes) on 24 A4 sheets (B156)', () => {
        expect(plan('money', 'printer')).toEqual({
            count: 22,
            sizes: ['320x450'],
        });
        expect(plan('money', 'home')).toEqual({
            count: 24,
            sizes: ['297x210'],
        });
        expect(
            composePages('money', 'home', {
                elements: {},
                moneyAmount: 'eight',
            }),
        ).toHaveLength(43);
        expect(
            composePages('money', 'printer', {
                elements: {},
                moneyAmount: 'four',
            }),
        ).toHaveLength(11);
    });

    it('puts the tokens, box lid and test sheet on their own pages', () => {
        expect(plan('tokens', 'printer')).toEqual({
            count: 1,
            sizes: ['297x210'],
        });
        expect(plan('box_lid', 'printer')).toEqual({
            count: 1,
            sizes: ['285x285'],
        });
        // At home on A4, in two pieces that overlap (R5-29): no A3 printer needed.
        expect(plan('box_lid', 'home')).toEqual({
            count: 2,
            sizes: ['210x297'],
        });
        expect(plan('calibration', 'home')).toEqual({
            count: 1,
            sizes: ['210x297'],
        });
    });

    it('plans the extra print items: booklet and invitation', () => {
        expect(plan('rules_booklet', 'printer')).toEqual({
            count: 16,
            sizes: ['166x228'],
        });
        expect(plan('rules_booklet', 'home')).toEqual({
            count: 8,
            sizes: ['297x210'],
        });
        expect(plan('invitation', 'printer')).toEqual({
            count: 1,
            sizes: ['123x166'],
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

    it('prints every deed and card, whatever the old part switches say: the print page chooses (B198)', () => {
        expect(
            cardKeys({ elements: {}, parts: { deeds: false, cards: false } }),
        ).toHaveLength(60);
    });

    it('adds the house rules card after the decks when it has a rule, whatever the old switch says (B210)', () => {
        expect(cardKeys({ elements: {} })).not.toContain('house_rules');

        const rules = { house_rules: { text: 'Wie gooit, deelt.' } };
        expect(
            cardKeys({ elements: rules, parts: { houseRules: false } }),
        ).toContain('house_rules');
        const keys = cardKeys({ elements: rules, parts: { houseRules: true } });

        expect(keys).toHaveLength(61);
        expect(keys.at(-1)).toBe('house_rules');
        expect(
            composePages('cards', 'printer', {
                elements: rules,
                parts: { houseRules: true },
            }),
        ).toHaveLength(122);
    });

    it('leaves an empty house rules card out of the set (bug 20 of test round 3)', () => {
        expect(
            cardKeys({ elements: {}, parts: { houseRules: true } }),
        ).not.toContain('house_rules');
        expect(
            cardKeys({
                elements: { house_rules: { text: ' \n ' } },
                parts: { houseRules: true },
            }),
        ).toHaveLength(60);
    });

    it('prints the extra cards after the 16 of their deck (B135), the same count as PrintLayoutTest', () => {
        const extra = {
            'card.chance.17': { added: true, text: 'Je wint de pubquiz.' },
            'card.chance.18': { added: true },
            'card.chest.17': { added: true, amount: -25 },
            'card.chest.18': { text: 'no added flag' },
        };
        const keys = cardKeys({ elements: extra });

        expect(keys).toHaveLength(63);
        expect(keys.indexOf('card.chance.17')).toBe(
            keys.indexOf('card.chance.16') + 1,
        );
        expect(keys.indexOf('card.chest.17')).toBe(
            keys.indexOf('card.chest.16') + 1,
        );
        expect(keys).not.toContain('card.chest.18');
        expect(
            composePages('cards', 'printer', { elements: extra }),
        ).toHaveLength(126);
        expect(composePages('cards', 'home', { elements: extra })).toHaveLength(
            16,
        );
    });

    it('deals the banknotes out value by value, so no sheet is only 1s', () => {
        const pages = composePages('money', 'home', edition);
        const keys = pages.flatMap((page) =>
            page.items.map((item) => item.elementKey),
        );

        // 2 to 4 players: 24 of 1, 5 and 10, 30 of 20, 12 of 50, 18 of 100, 12 of 500.
        expect(keys).toHaveLength(144);
        expect(keys.slice(0, 7)).toEqual([
            'note.1',
            'note.5',
            'note.10',
            'note.20',
            'note.50',
            'note.100',
            'note.500',
        ]);
        expect(keys.filter((key) => key === 'note.20')).toHaveLength(30);
        expect(keys.filter((key) => key === 'note.500')).toHaveLength(12);
        // R5-29 (Ria): the first sheets used to be only notes of 1.
        const first = new Set(pages[0]?.items.map((item) => item.elementKey));
        expect(first.size).toBeGreaterThan(1);
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
        expect(pages[0]?.size).toEqual({ w: 216, h: 216 });
    });
});
