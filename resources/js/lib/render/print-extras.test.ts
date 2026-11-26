import { describe, expect, it } from 'vitest';

import { bookletSpreads } from './print-extras';

describe('extra print items', () => {
    it('folds sixteen pages into four sheets, front and back', () => {
        const spreads = bookletSpreads();

        expect(spreads).toHaveLength(8);
        expect(spreads.flat().sort((a, b) => a - b)).toEqual(
            Array.from({ length: 16 }, (_, i) => i + 1),
        );
        // Pages that sit next to each other on a side add up to the page count plus one.
        for (const [left, right] of spreads) {
            expect(left + right).toBe(17);
        }
    });
});
