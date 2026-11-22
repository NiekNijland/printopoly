import { STRINGS } from './strings';

describe('the amount line of a card', () => {
    it('says what the money is for after the amount', () => {
        expect(STRINGS.nl.pay('€ 18', 'de schoonmaker')).toBe(
            'Betaal € 18 voor de schoonmaker',
        );
        expect(STRINGS.en.receive('£18', 'the cleaner')).toBe(
            'Collect £18 for the cleaner',
        );
        expect(STRINGS.nl.pay('€ 18', undefined)).toBe('Betaal € 18');
    });

    it('writes "voor" once when the purpose starts with it (R5-12)', () => {
        expect(STRINGS.nl.pay('€ 18', 'voor de schoonmaker')).toBe(
            'Betaal € 18 voor de schoonmaker',
        );
        expect(STRINGS.nl.receive('€ 18', 'Voor je verjaardag')).toBe(
            'Ontvang € 18 voor je verjaardag',
        );
        expect(STRINGS.en.pay('£18', 'for the cleaner')).toBe(
            'Pay £18 for the cleaner',
        );
        // Only the word itself: "voorschot" stays whole, and a purpose of only "voor" is no purpose.
        expect(STRINGS.nl.pay('€ 18', 'voorschot')).toBe(
            'Betaal € 18 voor voorschot',
        );
        expect(STRINGS.nl.pay('€ 18', 'voor ')).toBe('Betaal € 18');
    });
});
