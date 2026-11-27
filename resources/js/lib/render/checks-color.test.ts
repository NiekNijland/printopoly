import { describe, expect, it } from 'vitest';
import { runChecks } from './checks';
import { checkColor } from './checks-color';
import type { PartSelection } from './checks-types';
import { DEFAULT_BOARD_PROFILE } from './print-board';

const parts: PartSelection = {
    board: true,
    titleDeeds: true,
    cards: true,
    money: false,
    tokens: false,
    boxLid: false,
    houseRules: false,
};

describe('checkColor (B75, B130)', () => {
    const board = '#D4E9D7';

    it('stays quiet about a standard colour on a deed bar', () => {
        expect(
            checkColor({
                field: 'red',
                name: { nl: 'Rood', en: 'Red' },
                hex: '#ED1B24',
                role: 'bar',
                against: board,
            }),
        ).toEqual([]);
    });

    it('warns about a neon colour that print ink cannot make', () => {
        const issues = checkColor({
            field: 'green',
            name: { nl: 'X', en: 'X' },
            hex: '#00FF00',
            role: 'bar',
            against: board,
        });

        expect(issues.map((issue) => issue.code)).toContain(
            'style.out-of-gamut',
        );
        expect(issues[0]?.elementKey).toBe('theme_accent');
    });

    it('warns when the bar blends into the board', () => {
        expect(
            checkColor({
                field: 'lightblue',
                name: { nl: 'X', en: 'X' },
                hex: '#D4E9D7',
                role: 'bar',
                against: board,
            }).map((issue) => issue.code),
        ).toContain('style.low-contrast');
    });

    it('wants an accent that reads on the board', () => {
        expect(
            checkColor({
                field: 'accent',
                name: { nl: 'X', en: 'X' },
                hex: '#CFE8D2',
                role: 'accent',
                against: board,
            }).map((issue) => issue.code),
        ).toContain('style.low-contrast');
        expect(
            checkColor({
                field: 'accent',
                name: { nl: 'X', en: 'X' },
                hex: '#C8321F',
                role: 'accent',
                against: board,
            }),
        ).toEqual([]);
    });

    it('runs with the other checks', () => {
        const issues = runChecks({
            board: DEFAULT_BOARD_PROFILE,
            parts,
            elements: [],
            colors: [
                {
                    field: 'x',
                    name: { nl: 'X', en: 'X' },
                    hex: '#00FF00',
                    role: 'bar',
                    against: board,
                },
            ],
        });

        expect(issues.map((issue) => issue.code)).toContain(
            'style.out-of-gamut',
        );
    });
});
