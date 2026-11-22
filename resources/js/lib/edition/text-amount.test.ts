import { describe, expect, it } from 'vitest';

import { textAmount } from './text-amount';

describe('textAmount', () => {
    it('reads what a rewritten card pays or receives', () => {
        expect(
            textAmount('Niek rijdt de motor in de vangrail: betaal 100.'),
        ).toBe(-100);
        expect(
            textAmount('De verkoop van dopzalf gaat goed! ontvang 100.'),
        ).toBe(100);
        expect(textAmount('Je krijgt er 25 voor op Marktplaats.')).toBe(25);
        expect(
            textAmount(
                'Thom kotst de kartbaan onder: betaal 50 schoonmaakkosten',
            ),
        ).toBe(-50);
        expect(textAmount('Your shares paid off. Collect 50.')).toBe(50);
    });

    it('gives nothing for money per house, per player or per eye', () => {
        expect(
            textAmount('Betaal 40 per huis en 115 per hotel.'),
        ).toBeUndefined();
        expect(
            textAmount('Je staat onderaan: betaal elke speler 50.'),
        ).toBeUndefined();
        expect(textAmount('Gooi en betaal 10 keer de ogen.')).toBeUndefined();
    });

    it('gives nothing without money, or with two amounts that disagree', () => {
        expect(textAmount('Ga direct naar de gevangenis.')).toBeUndefined();
        expect(
            textAmount('Betaal 50, of ontvang 20 als je jarig bent.'),
        ).toBeUndefined();
        expect(textAmount('Ga naar Start en pak 200.')).toBe(200);
    });
});
