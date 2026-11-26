import { describe, expect, it } from 'vitest';

import { applyAmounts } from '@/lib/render/edition-amounts';
import { spaceAt } from '@/lib/render/standard-edition';
import type { OwnableSpace } from '@/types/game';

import { deedContent } from './deed-rows';

const own = (position: number) => spaceAt(position) as OwnableSpace;

describe('deedContent', () => {
    it('lists the rent table of a street from the game data in Dutch', () => {
        const content = deedContent(own(1), 'nl', 'eur');

        expect(content.rows.map((row) => [row.label, row.value])).toEqual([
            ['Huur', '€\u00A02'],
            ['Huur met kleurgroep', '€\u00A04'],
            ['Huur met 1 huis', '€\u00A010'],
            ['Huur met 2 huizen', '€\u00A030'],
            ['Huur met 3 huizen', '€\u00A090'],
            ['Huur met 4 huizen', '€\u00A0160'],
            ['Huur met hotel', '€\u00A0250'],
        ]);
        expect(content.costs.map((row) => [row.label, row.value])).toEqual([
            ['Kosten huis', '€\u00A050 per stuk'],
            ['Kosten hotel', '€\u00A050 per stuk'],
        ]);
        expect(content.costsNote).toBe('(plus 4 huizen)');
        expect(content.mortgage).toBe('€\u00A030');
        expect(content.unmortgage).toBe('€\u00A033');
    });

    it('uses the currency symbol and language of the edition', () => {
        const content = deedContent(own(39), 'en', 'play');

        expect(content.rows[0]).toEqual({ label: 'Rent', value: 'M50' });
        expect(content.rows[6]).toEqual({
            label: 'Rent with hotel',
            value: 'M2,000',
        });
        expect(content.rows[1]?.label).toBe('Rent with colour set');
        expect(content.costs.map((row) => [row.label, row.value])).toEqual([
            ['Houses cost', 'M200 each'],
            ['Hotels cost', 'M200 each'],
        ]);
        expect(content.costsNote).toBe('(plus 4 houses)');
    });

    it('lists rent for 1 to 4 stations', () => {
        const content = deedContent(own(5), 'nl', 'eur');

        expect(content.rows.map((row) => row.value)).toEqual([
            '€\u00A025',
            '€\u00A050',
            '€\u00A0100',
            '€\u00A0200',
        ]);
        expect(content.rows[0]?.label).toBe('Huur met 1 station');
        expect(content.rows[3]?.label).toBe('Huur met 4 stations');
        expect(content.mortgage).toBe('€\u00A0100');
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

        expect(content.rows[0]?.value).toBe('€\u00A055');
        // A full colour set stays twice the base rent.
        expect(content.rows[1]?.value).toBe('€\u00A0110');
        expect(content.rows[6]?.value).toBe('€\u00A02.200');
        expect(content.costs).toEqual([
            { label: 'Kosten huis', value: '€\u00A0220 per stuk' },
            { label: 'Kosten hotel', value: '€\u00A0220 per stuk' },
        ]);
        expect(content.mortgage).toBe('€\u00A0220');
        expect(content.unmortgage).toBe('€\u00A0242');
        expect(deedContent(space, 'en', 'play').costs[1]?.value).toBe(
            'M220 each',
        );
    });
});
