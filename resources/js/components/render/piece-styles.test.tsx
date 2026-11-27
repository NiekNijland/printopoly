import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { mix } from '@/lib/render/color';
import { PLAYFAIR, SPARTAN, THEMES } from '@/lib/render/themes';
import { defined } from '@/testing/defined';

import { CREAM } from './board-look';
import {
    ConfettiShape,
    Rope,
    Rosette,
    blockColor,
    diamond,
    pieceText,
    scallopedRect,
    scatter,
    seedOf,
    vintagePaper,
    type ConfettiPiece,
} from './piece-styles';

const inSvg = (children: ReactNode) => render(<svg>{children}</svg>).container;

describe('pieceText', () => {
    it('sets Vintage in spaced Playfair capitals, wider for a line', () => {
        expect(pieceText('vintage', 'name')).toEqual({
            family: PLAYFAIR,
            weight: 700,
            caps: true,
            letterSpacingEm: 0.06,
        });
        expect(pieceText('vintage', 'line').letterSpacingEm).toBe(0.16);
    });

    it('sets Modern in tight Spartan capitals for a name, spaced for a line', () => {
        expect(pieceText('modern', 'name')).toEqual({
            family: SPARTAN,
            weight: 800,
            caps: true,
            letterSpacingEm: -0.01,
        });
        expect(pieceText('modern', 'line').letterSpacingEm).toBe(0.05);
    });

    it('sets Speels in Spartan as typed and leaves the theme font without a style', () => {
        expect(pieceText('playful', 'name')).toEqual({
            family: SPARTAN,
            weight: 800,
        });
        expect(pieceText(undefined, 'name')).toEqual({});
    });
});

describe('blockColor and vintagePaper', () => {
    it('takes the second accent when the accent is the ink', () => {
        expect(blockColor(THEMES.classic)).toBe(THEMES.classic.secondaryAccent);
        expect(blockColor(THEMES.riso)).toBe(THEMES.riso.accent);
    });

    it('warms a colour towards cream by the given amount', () => {
        expect(vintagePaper('#FFFFFF')).toBe(mix('#FFFFFF', CREAM, 0.6));
        expect(vintagePaper('#FFFFFF', 1)).toBe(CREAM.toUpperCase());
        expect(vintagePaper('#FFFFFF', 0)).toBe('#FFFFFF');
    });
});

describe('seedOf', () => {
    it('hashes a text to the same number below 997 every time', () => {
        expect(seedOf('')).toBe(7);
        expect(seedOf('a')).toBe(314);
        expect(seedOf('Zaterdagclub')).toBe(seedOf('Zaterdagclub'));
        expect(seedOf('Zaterdagclub')).not.toBe(seedOf('Zondagclub'));
        expect(seedOf('a long name for a pawn')).toBeLessThan(997);
    });
});

describe('path helpers', () => {
    it('draws a diamond around its centre', () => {
        expect(diamond(5, 5, 1)).toBe('M5 4L6 5L5 6L4 5Z');
    });

    it('starts a wave two half periods early and runs past the end', () => {
        const waves = [
            ...inSvg(
                <Rope length={4} band={2} color="#000000" />,
            ).querySelectorAll('path'),
        ].map((path) => path.getAttribute('d') ?? '');

        expect(waves[0]).toBe(
            'M-4.000 1.000Q-3.000 -0.274 -2.000 1.000T0.000 1.000T2.000 1.000T4.000 1.000T6.000 1.000',
        );
        expect(waves[1]?.startsWith('M-2.667')).toBe(true);
    });

    it('scallops each side with a whole number of bumps, at least two', () => {
        expect(scallopedRect(0, 0, 4, 4, 2)).toBe(
            'M0.000 0.000' +
                'A1.000 1.000 0 0 1 2.000 0.000A1.000 1.000 0 0 1 4.000 0.000' +
                'A1.000 1.000 0 0 1 4.000 2.000A1.000 1.000 0 0 1 4.000 4.000' +
                'A1.000 1.000 0 0 1 2.000 4.000A1.000 1.000 0 0 1 0.000 4.000' +
                'A1.000 1.000 0 0 1 0.000 2.000A1.000 1.000 0 0 1 0.000 0.000Z',
        );
        expect(scallopedRect(0, 0, 1, 1, 5).match(/A/g)).toHaveLength(8);
        expect(scallopedRect(0, 0, 10, 4, 2).match(/A/g)).toHaveLength(14);
    });
});

describe('Rope and Rosette', () => {
    it('draws three waves and a hairline in the band', () => {
        const container = inSvg(<Rope length={20} band={2} color="#123456" />);
        const paths = [...container.querySelectorAll('path')];

        expect(paths).toHaveLength(4);
        expect(paths.map((path) => path.getAttribute('stroke'))).toEqual(
            Array(4).fill('#123456'),
        );
        expect(paths[3]?.getAttribute('d')).toBe('M0 1L20 1');
        expect(
            container.querySelector('svg svg')?.getAttribute('viewBox'),
        ).toBe('0 0 20 2');
    });

    it('turns six ellipses round a filled heart', () => {
        const container = inSvg(
            <Rosette cx={5} cy={6} r={4} color="#654321" />,
        );
        const ellipses = [...container.querySelectorAll('ellipse')];

        expect(ellipses).toHaveLength(6);
        expect(ellipses[5]?.getAttribute('transform')).toBe('rotate(150 5 6)');
        expect(container.querySelector('circle')?.getAttribute('r')).toBe(
            '0.8',
        );
    });
});

describe('ConfettiShape', () => {
    const piece = (kind: ConfettiPiece['kind']): ConfettiPiece => ({
        x: 10,
        y: 10,
        size: 2,
        color: '#FF0000',
        kind,
        turn: 45,
    });

    it.each([
        ['dot', 'circle', '#FF0000'],
        ['ring', 'circle', 'none'],
        ['dash', 'path', null],
        ['star', 'polygon', '#FF0000'],
        ['squiggle', 'path', 'none'],
    ] as const)('draws a %s as a %s', (kind, tag, fill) => {
        const shape = defined(
            inSvg(<ConfettiShape piece={piece(kind)} />).querySelector(
                'svg > *',
            ),
        );

        expect(shape.tagName.toLowerCase()).toBe(tag);
        expect(shape.getAttribute('fill')).toBe(fill);
    });

    it('turns the star and gives it five points', () => {
        const star = defined(
            inSvg(<ConfettiShape piece={piece('star')} />).querySelector(
                'polygon',
            ),
        );

        expect(star.getAttribute('transform')).toBe('rotate(45 10.00 10.00)');
        expect(star.getAttribute('points')?.split(' ')).toHaveLength(10);
    });
});

describe('scatter', () => {
    const box = { x: 10, y: 20, w: 40, h: 20 };
    const colors = ['#AA0000', '#00AA00', '#0000AA'];

    it('gives the same confetti for the same seed and other confetti for another', () => {
        expect(scatter(5, box, 8, 2, colors)).toEqual(
            scatter(5, box, 8, 2, colors),
        );
        expect(scatter(5, box, 8, 2, colors)).not.toEqual(
            scatter(6, box, 8, 2, colors),
        );
    });

    it('keeps every piece in the box, near its size, in one of the colours', () => {
        const pieces = scatter(11, box, 12, 2, colors);

        expect(pieces).toHaveLength(12);
        for (const piece of pieces) {
            expect(piece.x).toBeGreaterThanOrEqual(box.x);
            expect(piece.x).toBeLessThanOrEqual(box.x + box.w);
            expect(piece.y).toBeGreaterThanOrEqual(box.y);
            expect(piece.y).toBeLessThanOrEqual(box.y + box.h);
            expect(piece.size).toBeGreaterThanOrEqual(1.5);
            expect(piece.size).toBeLessThanOrEqual(2.5);
            expect(colors).toContain(piece.color);
        }
    });

    it('falls back to black without colours', () => {
        expect(scatter(1, box, 2, 1, []).map((piece) => piece.color)).toEqual([
            '#000000',
            '#000000',
        ]);
    });
});
