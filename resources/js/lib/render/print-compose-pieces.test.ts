import { pawnKey } from '@/lib/render/edition-keys';

import {
    money,
    moneyAmountOf,
    pawnKeysOf,
    tokens,
} from './print-compose-pieces';

describe('print-compose-pieces', () => {
    it('takes the money the edition chose, else the default of the set (B156)', () => {
        expect(moneyAmountOf({ moneyAmount: 'eight' }, 'home')).toBe('eight');
        expect(moneyAmountOf({ moneyAmount: 'lots' }, 'home')).toBe('four');
        expect(moneyAmountOf({}, 'printer')).toBe('full');
    });

    it('deals the notes value by value, so a sheet holds a mix (R5-29)', () => {
        const [first] = money('A4', 'four');
        const keys = first?.items.map((item) => item.elementKey) ?? [];

        expect(new Set(keys).size).toBeGreaterThan(1);
    });

    it('prints the pawns that are in the set (bug 32 of ronde 3)', () => {
        const edition = { elements: { [pawnKey(2)]: { hidden: true } } };

        expect(pawnKeysOf(edition)).toHaveLength(7);
        expect(pawnKeysOf(edition)).not.toContain(pawnKey(2));
        expect(tokens(edition).flatMap((p) => p.items)).toHaveLength(7);
    });
});
