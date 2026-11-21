import { describe, expect, it } from 'vitest';
import {
    deedsFor,
    formatMoney,
    groupMembers,
    mortgage,
    rentTable,
    setRent,
    spaceAt,
    spacesBySide,
    standardEdition,
    unmortgage,
} from './standard-edition';
import type { GroupId, StreetSpace } from './types';

const locales = ['nl', 'en'] as const;
const streets = standardEdition.spaces.filter(
    (space): space is StreetSpace => space.type === 'street',
);

describe('standard edition', () => {
    it('has 40 spaces at their own position', () => {
        expect(standardEdition.spaces).toHaveLength(40);
        standardEdition.spaces.forEach((space, index) =>
            expect(space.position).toBe(index),
        );
    });

    it('places the fixed spaces on the classic positions', () => {
        const typeAt = (positions: number[]) =>
            positions.map((position) => spaceAt(position).type);

        expect(typeAt([5, 15, 25, 35])).toEqual([
            'station',
            'station',
            'station',
            'station',
        ]);
        expect(typeAt([12, 28])).toEqual(['utility', 'utility']);
        expect(typeAt([4, 38])).toEqual(['tax', 'tax']);
        expect(typeAt([7, 22, 36])).toEqual(['chance', 'chance', 'chance']);
        expect(typeAt([2, 17, 33])).toEqual(['chest', 'chest', 'chest']);
        expect(typeAt([0, 10, 20, 30])).toEqual([
            'corner',
            'corner',
            'corner',
            'corner',
        ]);
    });

    it('has 28 ownable spaces: 22 streets, 4 stations and 2 utilities', () => {
        expect(deedsFor()).toHaveLength(28);
        expect(standardEdition.components.titleDeeds).toBe(28);
        expect(streets).toHaveLength(22);
        expect(
            deedsFor().filter((space) => space.type === 'station'),
        ).toHaveLength(4);
        expect(
            deedsFor().filter((space) => space.type === 'utility'),
        ).toHaveLength(2);
    });

    it('splits the streets into 8 groups of 2, 3, 3, 3, 3, 3, 3 and 2', () => {
        const order: GroupId[] = [
            'brown',
            'lightblue',
            'pink',
            'orange',
            'red',
            'yellow',
            'green',
            'darkblue',
        ];

        expect(standardEdition.groups.map((group) => group.id)).toEqual(order);
        expect(order.map((group) => groupMembers(group).length)).toEqual([
            2, 3, 3, 3, 3, 3, 3, 2,
        ]);
    });

    it('has the default group colours', () => {
        expect(
            Object.fromEntries(
                standardEdition.groups.map((group) => [group.id, group.color]),
            ),
        ).toEqual({
            brown: '#955436',
            lightblue: '#AAE0FA',
            pink: '#D93A96',
            orange: '#F7941D',
            red: '#ED1B24',
            yellow: '#FEF200',
            green: '#1FB25A',
            darkblue: '#0072BB',
        });
    });

    it('has a name in nl and en for every space and group', () => {
        for (const item of [
            ...standardEdition.spaces,
            ...standardEdition.groups,
        ]) {
            for (const locale of locales) {
                expect(item.name[locale].trim(), `${locale} name`).not.toBe('');
            }
        }
    });

    it('has unique names per locale on all spaces that are not card spaces', () => {
        const named = standardEdition.spaces.filter(
            (space) => space.type !== 'chance' && space.type !== 'chest',
        );

        for (const locale of locales) {
            expect(new Set(named.map((space) => space.name[locale])).size).toBe(
                named.length,
            );
        }
    });

    it('has 16 chance and 16 chest cards with unique ids', () => {
        const { chance, chest } = standardEdition.decks;
        const ids = [...chance, ...chest].map((card) => card.id);

        expect(chance).toHaveLength(16);
        expect(chest).toHaveLength(16);
        expect(new Set(ids).size).toBe(32);
    });

    it('has an effect and a text in nl and en on every card, and no duplicate texts', () => {
        const cards = [
            ...standardEdition.decks.chance,
            ...standardEdition.decks.chest,
        ];

        for (const card of cards) {
            for (const locale of locales) {
                expect(
                    card.effect[locale].trim(),
                    `${card.id} effect ${locale}`,
                ).not.toBe('');
                expect(
                    card.text[locale].trim(),
                    `${card.id} text ${locale}`,
                ).not.toBe('');
                expect(
                    card.text[locale].length,
                    `${card.id} text ${locale} fits a card`,
                ).toBeLessThanOrEqual(130);
            }
        }

        for (const locale of locales) {
            expect(new Set(cards.map((card) => card.text[locale])).size).toBe(
                cards.length,
            );
        }
    });

    it('has 210 notes: 30 of each of the 7 denominations', () => {
        const { notes } = standardEdition.money;

        expect(notes.map((note) => note.value)).toEqual([
            1, 5, 10, 20, 50, 100, 500,
        ]);
        expect(notes.every((note) => note.count === 30)).toBe(true);
        expect(notes.reduce((sum, note) => sum + note.count, 0)).toBe(210);
        expect(new Set(notes.map((note) => note.color)).size).toBe(7);
    });

    it('splits the starting cash into exactly 1500 using only existing denominations', () => {
        const { startingCash, notes } = standardEdition.money;
        const sum = startingCash.split.reduce(
            (total, part) => total + part.value * part.count,
            0,
        );

        expect(startingCash.total).toBe(1500);
        expect(sum).toBe(1500);
        expect(
            startingCash.split.every((part) =>
                notes.some((note) => note.value === part.value),
            ),
        ).toBe(true);
    });

    it('has the physical components', () => {
        expect(standardEdition.components).toEqual({
            titleDeeds: 28,
            houses: 32,
            hotels: 12,
            cardSizeMm: { width: 63, height: 88 },
        });
    });

    it('has four currencies', () => {
        expect(
            standardEdition.currencies.map((currency) => currency.symbol),
        ).toEqual(['€', '$', '£', 'M']);
    });
});

describe('rents and costs', () => {
    it('has strictly increasing street rents', () => {
        for (const street of streets) {
            expect(street.rent).toHaveLength(6);
            for (let i = 1; i < street.rent.length; i++) {
                expect(
                    street.rent[i],
                    `position ${street.position} step ${i}`,
                ).toBeGreaterThan(street.rent[i - 1] ?? Infinity);
            }
        }
    });

    it('has strictly increasing station rents of 25, 50, 100 and 200', () => {
        for (const position of [5, 15, 25, 35]) {
            expect(rentTable(position)).toEqual([25, 50, 100, 200]);
        }
    });

    it('has utility multipliers of 4 and 10', () => {
        for (const position of [12, 28]) {
            const space = spaceAt(position);
            expect(space.type === 'utility' && space.multipliers).toEqual([
                4, 10,
            ]);
        }
    });

    it('doubles the base rent for a full set, which stays below the one-house rent', () => {
        for (const street of streets) {
            expect(
                setRent(street.position),
                `position ${street.position}`,
            ).toBe(street.rent[0] * 2);
            expect(setRent(street.position)).toBeLessThan(street.rent[1]);
        }

        expect(setRent(1)).toBe(4);
        expect(setRent(39)).toBe(100);
        expect(() => setRent(5)).toThrow();
    });

    it('prices streets in increasing order around the board', () => {
        const prices = streets.map((street) => street.price);

        expect(prices).toEqual([...prices].sort((a, b) => a - b));
        expect(prices[0]).toBe(60);
        expect(prices.at(-1)).toBe(400);
    });

    it('has a mortgage of half the price, and unmortgaging costs 10% more', () => {
        for (const deed of deedsFor()) {
            expect(mortgage(deed.position)).toBe(deed.price / 2);
        }

        expect(unmortgage(1)).toBe(33);
        expect(unmortgage(5)).toBe(110);
        expect(unmortgage(12)).toBe(83);
        expect(unmortgage(39)).toBe(220);
    });

    it('throws when asking for rent or mortgage on a space that has none', () => {
        expect(() => rentTable(4)).toThrow();
        expect(() => mortgage(0)).toThrow();
        expect(() => rentTable(40)).toThrow();
    });

    it('has a house cost of 50, 100, 150 and 200 per side of the board', () => {
        const { bottom, left, top, right } = spacesBySide();
        const costs = (side: readonly (typeof bottom)[number][]) =>
            new Set(
                side
                    .filter(
                        (space): space is StreetSpace =>
                            space.type === 'street',
                    )
                    .map((space) => space.houseCost),
            );

        expect(costs(bottom)).toEqual(new Set([50]));
        expect(costs(left)).toEqual(new Set([100]));
        expect(costs(top)).toEqual(new Set([150]));
        expect(costs(right)).toEqual(new Set([200]));
    });

    it('matches the verified rent table for a few reference streets', () => {
        expect(rentTable(1)).toEqual([2, 10, 30, 90, 160, 250]);
        expect(rentTable(19)).toEqual([16, 80, 220, 600, 800, 1000]);
        expect(rentTable(34)).toEqual([28, 150, 450, 1000, 1200, 1400]);
        expect(rentTable(39)).toEqual([50, 200, 600, 1400, 1700, 2000]);
    });

    it('has the tax amounts and the salary', () => {
        const space = (position: number) => standardEdition.spaces[position];

        expect(space(4)).toMatchObject({ type: 'tax', amount: 200 });
        expect(space(38)).toMatchObject({ type: 'tax', amount: 100 });
        expect(space(0)).toMatchObject({
            type: 'corner',
            corner: 'start',
            salary: 200,
        });
    });
});

describe('helpers', () => {
    it('splits the board into 4 sides of 9 plus 4 corners', () => {
        const sides = spacesBySide();

        expect(sides.corners.map((corner) => corner.position)).toEqual([
            0, 10, 20, 30,
        ]);
        expect(
            [sides.bottom, sides.left, sides.top, sides.right].map(
                (side) => side.length,
            ),
        ).toEqual([9, 9, 9, 9]);
        expect(sides.bottom[0]?.position).toBe(1);
        expect(sides.right[8]?.position).toBe(39);
    });

    it('lists group members in board order', () => {
        expect(groupMembers('brown').map((street) => street.position)).toEqual([
            1, 3,
        ]);
        expect(
            groupMembers('darkblue').map((street) => street.position),
        ).toEqual([37, 39]);
    });

    it('formats money per locale', () => {
        expect(formatMoney(1500, 'eur', 'nl')).toBe('€\u00A01.500');
        expect(formatMoney(1500, 'eur', 'en')).toBe('€1,500');
        expect(formatMoney(200, 'gbp', 'en')).toBe('£200');
        expect(formatMoney(50, 'play', 'nl')).toBe('M\u00A050');
    });
});
