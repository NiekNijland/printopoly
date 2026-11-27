import { describe, expect, it } from 'vitest';

import { cornerOf, standardCornerText } from './corners';

describe('cornerOf', () => {
    it('names the four corners by position', () => {
        expect(cornerOf(0)).toBe('start');
        expect(cornerOf(10)).toBe('jail');
        expect(cornerOf(20)).toBe('parking');
        expect(cornerOf(30)).toBe('gotojail');
    });

    it('returns undefined for a space that is not a corner or off the board', () => {
        expect(cornerOf(1)).toBeUndefined();
        expect(cornerOf(40)).toBeUndefined();
    });
});

describe('standardCornerText', () => {
    it('prints the standard salary on Start', () => {
        expect(standardCornerText('start', 'nl', 'eur')).toBe(
            'Ontvang €\u00A0200 als je langs Start komt',
        );
        expect(standardCornerText('start', 'en', 'gbp')).toBe(
            'Collect £200 when you pass Start',
        );
    });

    it('uses the salary, symbol and Start name of the edition', () => {
        expect(
            standardCornerText('start', 'nl', 'eur', 'K', 400, ' Thuis '),
        ).toBe('Ontvang K\u00A0400 als je langs Thuis komt');
    });

    it('falls back to the standard name when the Start name is blank', () => {
        expect(
            standardCornerText('start', 'en', 'usd', undefined, 50, '  '),
        ).toBe('Collect $50 when you pass Start');
    });

    it('labels the jail and leaves the other corners empty', () => {
        expect(standardCornerText('jail', 'nl', 'eur')).toBe('In de cel');
        expect(standardCornerText('jail', 'en', 'gbp')).toBe('In jail');
        expect(standardCornerText('parking', 'nl', 'eur')).toBe('');
        expect(standardCornerText('gotojail', 'en', 'gbp')).toBe('');
    });
});
