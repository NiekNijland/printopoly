import { describe, expect, it } from 'vitest';

import {
    cornerRotation,
    diagonalBandWidth,
    jailNameParts,
    splitBalanced,
    visitingLegs,
} from './corner-layout';

describe('corner layout', () => {
    it('turns each corner a quarter turn further around the board, like the spaces after it', () => {
        expect([0, 10, 20, 30].map(cornerRotation)).toEqual([0, 90, 180, 270]);
    });

    it('splits a corner name into two lines of about the same length', () => {
        expect(splitBalanced('Ga naar de gevangenis')).toEqual([
            'Ga naar de',
            'gevangenis',
        ]);
        expect(splitBalanced('Vrij parkeren')).toEqual(['Vrij', 'parkeren']);
        expect(splitBalanced('Go to Jail')).toEqual(['Go to', 'Jail']);
        expect(splitBalanced('  Bajes ')).toEqual(['Bajes', '']);
    });

    it('puts the place of the jail on the cell and what is between brackets on the edges', () => {
        expect(
            jailNameParts('Politiebureau Raalte (op bezoek)', 'Op bezoek'),
        ).toEqual({ place: 'Politiebureau Raalte', visiting: 'Op bezoek' });
        expect(jailNameParts('Jail (just visiting)', 'Just visiting')).toEqual({
            place: 'Jail',
            visiting: 'Just visiting',
        });
        expect(jailNameParts('De bajes', 'Op bezoek')).toEqual({
            place: 'De bajes',
            visiting: 'Op bezoek',
        });
        expect(jailNameParts('(alleen kijken)', 'Op bezoek')).toEqual({
            place: '',
            visiting: 'Alleen kijken',
        });
    });

    it('runs the first word along the first edge and the rest along the second', () => {
        expect(visitingLegs('Op bezoek')).toEqual(['Op', 'bezoek']);
        expect(visitingLegs('Even op bezoek')).toEqual(['Even', 'op bezoek']);
        expect(visitingLegs('Bezoek')).toEqual(['', 'Bezoek']);
    });

    it('makes a band on the diagonal as wide as the square allows at its height', () => {
        const square = { left: 0, top: 0, right: 70, bottom: 70 };
        const centre = { x: 35, y: 35 };
        const middle = diagonalBandWidth(square, centre, 0, 10);
        const outer = diagonalBandWidth(square, centre, 25, 10);

        // Through the middle a 10 mm band reaches the corners of the square, minus its own height.
        expect(middle).toBeCloseTo(70 * Math.SQRT2 - 10, 5);
        expect(outer).toBeLessThan(middle);
        expect(diagonalBandWidth(square, centre, 60, 10)).toBe(0);
    });
});
