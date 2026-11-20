import { describe, expect, it } from 'vitest';

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
});
