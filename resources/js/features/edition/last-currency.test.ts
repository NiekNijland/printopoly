import { readStored, writeStored } from '@/lib/browser-storage';

import { readLastCurrency, rememberCurrency } from './last-currency';

describe('last currency', () => {
    it('knows no currency before one is picked', () => {
        expect(readLastCurrency()).toBeNull();
    });

    it('gives back the currency picked last', () => {
        rememberCurrency('gbp');
        rememberCurrency('play');

        expect(readLastCurrency()).toBe('play');
        expect(readStored('printopoly.lastCurrency')).toBe('play');
    });

    it('ignores a stored value that is no currency of the game', () => {
        writeStored('printopoly.lastCurrency', 'yen');

        expect(readLastCurrency()).toBeNull();
    });
});
