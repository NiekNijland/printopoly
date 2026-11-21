import { describe, expect, it } from 'vitest';

import { applyAmounts } from '@/lib/edition/amounts';
import { spaceAt } from '@/lib/game/standard-edition';
import type { OwnableSpace } from '@/lib/game/types';

import { deedContent } from './deed-rows';

const own = (position: number) => spaceAt(position) as OwnableSpace;

describe('deedContent', () => {
    it('lists the rent table of a street from the game data in Dutch', () => {
        const content = deedContent(own(1), 'nl', 'eur');

        expect(content.rows.map((row) => [row.label, row.value])).toEqual([
            ['Huur', '€ 2'],
            ['Hele kleur in bezit', '€ 4'],
            ['Met 1 huis', '€ 10'],
            ['Met 2 huizen', '€ 30'],
            ['Met 3 huizen', '€ 90'],
            ['Met 4 huizen', '€ 160'],
            ['Met hotel', '€ 250'],
        ]);
        expect(content.footer).toBe('Huis € 50 · hotel € 50 plus 4 huizen');
        expect(content.mortgage).toBe('€ 30');
        expect(content.unmortgage).toBe('€ 33');
    });

    it('uses the currency symbol and language of the edition', () => {
        const content = deedContent(own(39), 'en', 'play');

        expect(content.rows[0]).toEqual({ label: 'Rent', value: 'M50' });
        expect(content.rows[6]).toEqual({
            label: 'With hotel',
            value: 'M2,000',
        });
        expect(content.footer).toBe('House M200 · hotel M200 plus 4 houses');
    });

    it('lists rent for 1 to 4 stations', () => {
        const content = deedContent(own(5), 'nl', 'eur');

        expect(content.rows.map((row) => row.value)).toEqual([
            '€ 25',
            '€ 50',
            '€ 100',
            '€ 200',
        ]);
        expect(content.rows[0]?.label).toBe('Huur met 1 station');
        expect(content.rows[3]?.label).toBe('Huur met 4 stations');
        expect(content.mortgage).toBe('€ 100');
    });

    it('explains utility rent with the multipliers instead of a table', () => {
        const content = deedContent(own(12), 'nl', 'eur');

        expect(content.rows).toEqual([]);
        expect(content.footer).toContain('4 keer');
        expect(content.footer).toContain('10 keer');
        expect(deedContent(own(12), 'en', 'play').footer).toContain('4 times');
    });

    it('prints the amounts of the edition in the rows, the building costs and the mortgage (B132, B133)', () => {
        const space = applyAmounts(own(39), {
            price: 450,
            'rent.0': 55,
            'rent.5': 2200,
            houseCost: 220,
            mortgage: 220,
        }) as OwnableSpace;
        const content = deedContent(space, 'nl', 'eur');

        expect(content.rows[0]?.value).toBe('€ 55');
        // A full colour set stays twice the base rent.
        expect(content.rows[1]?.value).toBe('€ 110');
        expect(content.rows[6]?.value).toBe('€ 2.200');
        expect(content.costs).toEqual([
            { label: 'Kosten huis', value: '€ 220 per stuk' },
            { label: 'Kosten hotel', value: '€ 220 per stuk (plus 4 huizen)' },
        ]);
        expect(content.mortgage).toBe('€ 220');
        expect(content.unmortgage).toBe('€ 242');
        expect(deedContent(space, 'en', 'play').costs[1]?.value).toBe(
            'M220 each (plus 4 houses)',
        );
    });
});
